import { Injectable } from '@tanbo/di'
import { map, microTask, Subscription } from '@tanbo/stream'

import { ChangeEmitter, Component, Fragment, JSXElement, JSXText, VNode } from '../model/_api'
import { getNodeChanges } from './_utils'
import { makeError } from '../_utils/make-error'
import { NativeNode, NativeRenderer } from './injection-tokens'

const rendererErrorFn = makeError('Renderer')

export abstract class RootComponentRef {
  abstract component: Component
  abstract host: NativeNode
}

type Depth = number

class Atom {
  next: Atom | null = null
  nativeNode: NativeNode | null = null

  constructor(
    public jsxNode: JSXElement | JSXText | Component,
    public depth: number
  ) {
  }
}

interface ComponentView {
  start: Atom
  end: Atom

  render(): JSXElement | Component | Fragment
}

export class Ref<T> {
  constructor(public current: T) {
  }
}

@Injectable()
export class Renderer {
  private componentViewCaches = new WeakMap<Component, ComponentView>()
  private root = new Atom(this.rootComponentRef.component, 1)

  private subscription = new Subscription()

  private renderedComponents: Component[] = []

  constructor(private nativeRenderer: NativeRenderer,
              private changeEmitter: ChangeEmitter,
              private rootComponentRef: RootComponentRef) {
  }

  render() {
    const { host } = this.rootComponentRef
    this.root.nativeNode = host
    this.buildChildren(this.root, host, 0)

    this.subscription.add(
      this.changeEmitter.onComponentChanged.pipe(
        microTask(),
        map(components => {
          return new Set(components)
        })
      ).subscribe(components => {
        this.renderedComponents = []
        components.forEach(component => {
          if (this.renderedComponents.includes(component)) {
            return
          }
          this.patch(component)
        })
      })
    )
  }

  private patch(component: Component) {
    const { start, end, render } = this.componentViewCaches.get(component)!
    const template = render()
    const newStartAtom = new Atom(component, start.depth)
    const newEndAtom = this.createChain(template, newStartAtom, start.depth)
    this.reconcile(start.nativeNode!, newStartAtom.next, start.next, end)
    start.next = newStartAtom.next
    newEndAtom.next = end.next
    this.componentViewCaches.set(component, {
      start,
      end: newEndAtom,
      render
    })
  }

  private reconcile(host: NativeNode, newStartAtom: Atom | null, oldStartAtom: Atom | null, oldEndAtom: Atom) {
    const renderContext: NativeNode[] = [host]

    function getContext() {
      return renderContext[renderContext.length - 1]
    }

    while (true) {
      const host = getContext()
      if (newStartAtom) {
        if (oldStartAtom) {
          if (newStartAtom.depth === oldStartAtom.depth) {
            if (newStartAtom.jsxNode instanceof JSXElement) {
              if (oldStartAtom.jsxNode instanceof JSXElement) {
                if (newStartAtom.jsxNode.name === oldStartAtom.jsxNode.name) {
                  this.updateNativeNodeProperties(newStartAtom.jsxNode, oldStartAtom.jsxNode, oldStartAtom.nativeNode!)
                  newStartAtom.nativeNode = oldStartAtom.nativeNode
                  newStartAtom = newStartAtom.next
                  oldStartAtom = oldStartAtom.next
                } else {
                  const nativeNode = this.createElement(newStartAtom.jsxNode)
                  newStartAtom.nativeNode = nativeNode
                  if (newStartAtom.next) {
                    newStartAtom = this.buildChildren(newStartAtom.next, nativeNode, newStartAtom.depth)
                  }
                  this.nativeRenderer.insertBefore(nativeNode, oldStartAtom.nativeNode!)
                  oldStartAtom = this.cleanView(oldStartAtom, oldEndAtom)
                }
              } else {
                // eslint-disable-next-line no-lonely-if
                if (oldStartAtom.jsxNode instanceof JSXText) {
                  this.nativeRenderer.remove(oldStartAtom.nativeNode!)
                  oldStartAtom = oldStartAtom.next
                } else {
                  oldStartAtom = this.cleanView(oldStartAtom, oldEndAtom)
                }
              }
            } else {
              // eslint-disable-next-line no-lonely-if
              if (newStartAtom.jsxNode instanceof JSXText) {
                if (oldStartAtom.jsxNode instanceof JSXText) {
                  newStartAtom.nativeNode = oldStartAtom.nativeNode
                  this.nativeRenderer.syncTextContent(newStartAtom.nativeNode!, newStartAtom.jsxNode.text)
                  newStartAtom = newStartAtom.next
                  oldStartAtom = oldStartAtom.next
                } else {
                  const nativeTextNode = this.createTextNode(newStartAtom.jsxNode)
                  newStartAtom.nativeNode = nativeTextNode
                  this.nativeRenderer.insertAfter(nativeTextNode, host)
                  newStartAtom = newStartAtom.next
                }
              } else {
                // eslint-disable-next-line no-lonely-if
                if (oldStartAtom.jsxNode instanceof Component) {
                  if (newStartAtom.jsxNode.factory === oldStartAtom.jsxNode.factory) {
                    const { isChanged } = getNodeChanges(newStartAtom.jsxNode, oldStartAtom.jsxNode)
                    if (!isChanged) {
                      const next = newStartAtom.next
                      newStartAtom.jsxNode = oldStartAtom.jsxNode
                      const { start, end } = this.componentViewCaches.get(oldStartAtom.jsxNode)!
                      newStartAtom.next = start.next
                      oldStartAtom = end.next
                      newStartAtom = next
                    } else {
                      oldStartAtom = oldStartAtom.next
                      const next = newStartAtom.next
                      const left = this.componentRender(newStartAtom.jsxNode, newStartAtom, newStartAtom.depth)
                      newStartAtom = newStartAtom.next
                      left.next = next
                    }
                  } else {
                    newStartAtom.nativeNode = host
                    const next = newStartAtom.next
                    const left = this.componentRender(newStartAtom.jsxNode, newStartAtom, newStartAtom.depth)
                    newStartAtom = newStartAtom.next
                    left.next = next
                    oldStartAtom = oldStartAtom.next
                  }
                } else {
                  newStartAtom.nativeNode = host
                  const next = newStartAtom.next
                  const left = this.componentRender(newStartAtom.jsxNode, newStartAtom, newStartAtom.depth)
                  newStartAtom = newStartAtom.next
                  left.next = next
                }
              }
            }
          } else {
            // eslint-disable-next-line no-lonely-if
            if (newStartAtom.depth > oldStartAtom.depth) {
              oldStartAtom = this.cleanView(oldStartAtom, oldEndAtom)
            } else {
              newStartAtom = this.buildChildren(newStartAtom, host, newStartAtom.depth)
            }
          }
          continue
        } else {
          this.buildNextAtomView(newStartAtom)
        }
        break
      }
      if (oldStartAtom && oldEndAtom.next !== oldStartAtom) {
        const end = this.cleanView(oldStartAtom, oldEndAtom)
        if (end === oldStartAtom) {
          break
        }
        oldStartAtom = end
        continue
      }
      break
    }
  }

  private buildNextAtomView(startAtom: Atom) {
    const renderContext: NativeNode[] = [startAtom.nativeNode!]

    function getContext() {
      return renderContext[renderContext.length - 1]
    }

    let atom: Atom | null = startAtom.next
    let depth = startAtom.depth

    while (atom) {
      let host = getContext()
      if (!host) {
        throw rendererErrorFn('missing reference nodes during rendering process.')
      }
      if (atom.jsxNode instanceof Component) {
        atom.nativeNode = host
        const next = atom.next
        const left = this.componentRender(atom.jsxNode, atom, atom.depth)
        atom = atom.next
        left.next = next
        continue
      }
      const child = atom.jsxNode instanceof JSXElement ?
        this.createElement(atom.jsxNode) :
        this.createTextNode(atom.jsxNode)
      atom.nativeNode = child
      if (depth - atom.depth === 1) {
        this.nativeRenderer.appendChild(host, child)
        renderContext.push(child)
      } else if (depth - atom.depth === 0) {
        renderContext.push()
        renderContext.push(child)
        this.nativeRenderer.insertAfter(child, host)
      } else {
        renderContext.splice(renderContext.length - (atom.depth - depth), atom.depth - depth)
        host = getContext()
        this.nativeRenderer.insertAfter(child, host)
      }
      depth = atom.depth
    }

    return atom
  }

  private buildChildren(startAtom: Atom, host: NativeNode, stopDeep: number): Atom | null {
    const renderContext: NativeNode[] = [host]

    function getContext() {
      return renderContext[renderContext.length - 1]
    }

    let depth = startAtom.depth
    let atom: Atom | null = startAtom
    while (atom) {
      if (atom.depth <= stopDeep) {
        break
      }
      const host = getContext()
      if (atom.jsxNode instanceof Component) {
        atom.nativeNode = host
        const next = atom.next
        const left = this.componentRender(atom.jsxNode, atom, atom.depth)
        atom = atom.next
        left.next = next
        continue
      }
      const child = atom.jsxNode instanceof JSXElement ?
        this.createElement(atom.jsxNode) :
        this.createTextNode(atom.jsxNode)
      atom.nativeNode = child

      this.nativeRenderer.appendChild(host, child)
      if (atom.next) {
        depth = atom.next.depth - atom.depth
      }
      if (depth === 1) {
        renderContext.push(child)
      } else if (depth < 0) {
        renderContext.splice(renderContext.length + depth, -depth)
      }
      atom = atom.next
    }
    return atom
  }

  private createElement(vNode: JSXElement) {
    const nativeNode = this.nativeRenderer.createElement(vNode.name)
    const props = vNode.props
    if (props) {
      props.attrs.forEach((value, key) => {
        if (key === 'ref') {
          if (value instanceof Ref) {
            value.current = nativeNode
          }
          return
        }
        this.nativeRenderer.setProperty(nativeNode, key, value)
      })
      props.styles.forEach((value, key) => {
        this.nativeRenderer.setStyle(nativeNode, key, value)
      })
      props.classes.forEach(k => this.nativeRenderer.addClass(nativeNode, k))

      Object.keys(props.listeners).forEach(type => {
        this.nativeRenderer.listen(nativeNode, type, props.listeners[type])
      })
    }
    return nativeNode
  }

  private createTextNode(child: JSXText) {
    return this.nativeRenderer.createTextNode(child.text)
  }

  private componentRender(origin: Component, left: Atom, depth: Depth): Atom {
    this.renderedComponents.push(origin)
    const { template, render } = origin.setup(this.changeEmitter)
    const right = this.createChain(template, left, depth)
    this.componentViewCaches.set(origin, {
      start: left,
      end: right,
      render
    })
    return right
  }

  private createChainByComponent(template: Component, left: Atom, depth: Depth): Atom {
    if (template.factory === Fragment) {
      return this.createChainByChildren(template.props?.children || [], left, depth)
    }
    const right = new Atom(template, depth)
    left.next = right
    return right
  }

  private createChain(template: JSXElement | Component | Fragment | JSXText, left: Atom, depth: Depth): Atom {
    if (template instanceof JSXElement) {
      left = this.createChainByJSXElement(template, left, depth)
    } else if (template instanceof Component) {
      left = this.createChainByComponent(template, left, depth)
    } else if (template instanceof JSXText) {
      left = this.createChainByJSXText(template, left, depth)
    } else {
      left = this.createChainByChildren(template.props?.children || [], left, depth)
    }
    return left
  }

  private createChainByChildren(children: VNode[], left: Atom, depth: Depth): Atom {
    for (const item of children) {
      left = this.createChain(item, left, depth)
    }
    return left
  }

  private createChainByJSXElement(element: JSXElement, left: Atom, depth: Depth): Atom {
    const atom = new Atom(element, depth)
    left.next = atom
    if (element.props?.children) {
      return this.createChainByChildren(element.props.children, atom, depth + 1)
    }
    return atom
  }

  private createChainByJSXText(element: JSXText, left: Atom, depth: Depth): Atom {
    const atom = new Atom(element, depth)
    left.next = atom
    return atom
  }

  private updateNativeNodeProperties(newVNode: JSXElement, oldVNode: JSXElement, nativeNode: NativeNode) {
    const { styleChanges, attrChanges, classesChanges, listenerChanges, isChanged } = getNodeChanges(newVNode, oldVNode)

    if (!isChanged) {
      return
    }

    styleChanges.remove.forEach(i => this.nativeRenderer.removeStyle(nativeNode, i))
    styleChanges.set.forEach(i => this.nativeRenderer.setStyle(nativeNode, i[0], i[1]))

    attrChanges.remove.forEach(i => this.nativeRenderer.removeProperty(nativeNode, i))
    attrChanges.set.forEach(([key, value]) => {
      if (key === 'ref' && value instanceof Ref) {
        value.current = nativeNode
        return
      }
      this.nativeRenderer.setProperty(nativeNode, key, value)
    })

    classesChanges.remove.forEach(i => this.nativeRenderer.removeClass(nativeNode, i))
    classesChanges.add.forEach(i => this.nativeRenderer.addClass(nativeNode, i))

    listenerChanges.remove.forEach(i => {
      this.nativeRenderer.unListen(nativeNode, i[0], i[1])
    })
    listenerChanges.add.forEach(i => {
      this.nativeRenderer.listen(nativeNode, i[0], i[1])
    })
  }

  private cleanView(startAtom: Atom, stopAtom: Atom) {
    let next = startAtom.next
    while (next && next !== stopAtom && next.depth > startAtom.depth) {
      next = next.next
    }
    this.nativeRenderer.remove(startAtom.nativeNode!)
    return next
  }
}
