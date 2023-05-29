import {Injectable} from '@tanbo/di'
import {map, microTask, Subscription} from '@tanbo/stream'

import {ChangeEmitter, Component, Fragment, JSXElement, JSXText, VNode} from '../model/_api'
import {getNodeChanges} from './_utils'
import {makeError} from '../_utils/make-error'
import {NativeNode, NativeRenderer} from './injection-tokens'

const rendererErrorFn = makeError('Renderer')

export abstract class RootComponentRef {
  abstract component: Component
  abstract host: NativeNode
}

export class JSXComponent {
  constructor(public component: Component,
              public isBegin: boolean) {
  }
}

type Depth = number

class Atom {
  next: Atom | null = null
  nativeNode: NativeNode | null = null

  constructor(
    public jsxNode: JSXElement | JSXText | JSXComponent,
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
  private root: Atom

  private subscription = new Subscription()

  private renderedComponents: Component[] = []

  constructor(private nativeRenderer: NativeRenderer,
              private changeEmitter: ChangeEmitter,
              private rootComponentRef: RootComponentRef) {
    this.root = new Atom(new JSXComponent(this.rootComponentRef.component, true), 1)
    this.root.next = new Atom(new JSXComponent(this.rootComponentRef.component, false), 1)
  }

  render() {
    const {host, component} = this.rootComponentRef
    this.root.nativeNode = host
    this.buildChildren(this.root, host, 0)

    this.subscription.add(
      this.changeEmitter.onComponentChanged.pipe(
        microTask(),
        map(components => {
          return new Set(components)
        })
      ).subscribe(components => {
        this.patch(component)
        // this.renderedComponents = []
        // components.forEach(component => {
        //   if (this.renderedComponents.includes(component)) {
        //     return
        //   }
        //   this.patch(component)
        // })
      })
    )
  }

  private patch(component: Component) {
    const {start, end, render} = this.componentViewCaches.get(component)!
    const template = render()
    const oldStartNext = start.next
    const endNext = end.next
    end.next = null
    const newEndAtom = this.createChain(template, start, start.depth)
    newEndAtom.next = endNext
    this.componentViewCaches.set(component, {
      start,
      end: newEndAtom,
      render
    })
    this.reconcile(start, oldStartNext, end)
  }

  private reconcile(hostAtom: Atom, oldStartAtom: Atom | null, oldEndAtom: Atom) {
    const context: NativeNode[] = [hostAtom.nativeNode!]

    function getContext() {
      return context[context.length - 1]
    }

    let hostDepth = hostAtom.depth
    let start = hostAtom.next
    let prevAtom = oldEndAtom
    let diffAtom = oldStartAtom
    oldEndAtom.next = oldStartAtom

    let i = 0

    while (start && !start.nativeNode && diffAtom) {
      if (i > 1000) {
        break
      }
      i++
      let rule = start.depth - hostDepth
      hostDepth = start.depth
      if (rule < 0) {
        context.splice(context.length + rule, -rule)
        rule = 0
      }
      const host = getContext()

      prevAtom = this.diff(start, prevAtom, diffAtom, host, rule)
      if (rule === 0) {
        context.pop()
      }
      context.push(start.nativeNode!)
      start = start.next
      diffAtom = prevAtom.next
    }

    let next = prevAtom!.next
    prevAtom!.next = null
    while (next) {
      this.nativeRenderer.remove(next.nativeNode!)
      next = next.next
    }
  }

  private diff(start: Atom, prevAtom: Atom, oldAtom: Atom, host: NativeNode, rule: number): Atom {
    let diffAtom: Atom = oldAtom
    const stopAtom = diffAtom

    do {
      if (start.jsxNode instanceof JSXElement) {
        if (diffAtom.jsxNode instanceof JSXElement && start.jsxNode.name === diffAtom.jsxNode.name) {
          const nativeNode = diffAtom.nativeNode!
          this.updateNativeNodeProperties(start.jsxNode, diffAtom.jsxNode, nativeNode)
          start.nativeNode = nativeNode
          if (rule === 1) {
            this.nativeRenderer.prependChild(host, nativeNode)
          } else {
            this.nativeRenderer.insertAfter(nativeNode, host)
          }
          prevAtom.next = diffAtom.next
          diffAtom.next = null
          return prevAtom
        }
      } else if (start.jsxNode instanceof JSXText) {
        if (diffAtom.jsxNode instanceof JSXText) {
          const nativeNode = diffAtom.nativeNode!
          if (start.jsxNode.text !== diffAtom.jsxNode.text) {
            this.nativeRenderer.syncTextContent(nativeNode, start.jsxNode.text)
          }
          start.nativeNode = nativeNode
          if (rule === 1) {
            this.nativeRenderer.prependChild(host, nativeNode)
          } else {
            this.nativeRenderer.insertAfter(nativeNode, host)
          }
          prevAtom.next = diffAtom.next
          diffAtom.next = null
          return prevAtom
        }
      } else if (diffAtom.jsxNode instanceof JSXComponent) {
        if (start.jsxNode.component.factory === diffAtom.jsxNode.component.factory) {
          const nativeNode = diffAtom.nativeNode!
          start.nativeNode = nativeNode
          if (rule === 1) {
            this.nativeRenderer.prependChild(host, nativeNode)
          } else {
            this.nativeRenderer.insertAfter(nativeNode, host)
          }
          if (start.jsxNode.isBegin) {
            this.componentRender(start.jsxNode.component, start, start.depth)
          }
          return diffAtom
        }
      }
      prevAtom = diffAtom
      diffAtom = diffAtom.next!
      if (diffAtom === stopAtom) {
        break
      }
    } while (oldAtom !== stopAtom)

    let nativeNode
    if (start.jsxNode instanceof JSXComponent) {
      nativeNode = this.createComponentMark(start.jsxNode)
      start.nativeNode = nativeNode
      this.componentRender(start.jsxNode.component, start, start.depth)
    } else {
      nativeNode = start.jsxNode instanceof JSXElement ?
        this.createElement(start.jsxNode) :
        this.createTextNode(start.jsxNode)
      start.nativeNode = nativeNode
    }

    if (rule === 1) {
      this.nativeRenderer.prependChild(host, nativeNode)
    } else {
      this.nativeRenderer.insertAfter(nativeNode, host)
    }
    return prevAtom
  }

  private buildChildren(startAtom: Atom, host: NativeNode, stopDeep: number): Atom | null {
    const renderContext: NativeNode[] = [host]

    function getContext() {
      return renderContext[renderContext.length - 1]
    }

    let depth = stopDeep
    let atom: Atom | null = startAtom
    while (atom) {
      let rule = atom.depth - depth
      depth = atom.depth
      if (rule < 0) {
        renderContext.splice(renderContext.length + rule, -rule)
        rule = 0
      }
      const host = getContext()
      if (atom.jsxNode instanceof JSXComponent) {
        const isBegin = atom.jsxNode.isBegin
        const nativeNode = this.createComponentMark(atom.jsxNode)
        atom.nativeNode = nativeNode
        if (rule === 0) {
          renderContext.pop()
          this.nativeRenderer.insertAfter(nativeNode, host)
        } else {
          this.nativeRenderer.appendChild(host, nativeNode)
        }
        renderContext.push(nativeNode)
        if (isBegin) {
          this.componentRender(atom.jsxNode.component, atom, atom.depth)
        }
        atom = atom.next
        continue
      }
      const child = atom.jsxNode instanceof JSXElement ?
        this.createElement(atom.jsxNode) :
        this.createTextNode(atom.jsxNode)
      atom.nativeNode = child
      if (atom.jsxNode instanceof JSXElement) {
        child.setAttribute('depth', atom.depth)
      } else {
        child.textContent += `depth: ${depth}`
      }

      if (rule === 0) {
        renderContext.pop()
        this.nativeRenderer.insertAfter(child, host)
      } else {
        this.nativeRenderer.appendChild(host, child)
      }
      renderContext.push(child)
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

  private createComponentMark(vNode: JSXComponent) {
    return this.nativeRenderer.createCommentNode(vNode.component.factory.name + (vNode.isBegin ? ' begin' : ' close'))
  }

  private createTextNode(child: JSXText) {
    return this.nativeRenderer.createTextNode(child.text)
  }

  private componentRender(origin: Component, left: Atom, depth: Depth): Atom {
    this.renderedComponents.push(origin)
    const {template, render} = origin.setup(this.changeEmitter)
    const next = left.next!
    const right = this.createChain(template, left, depth)
    right.next = next
    this.componentViewCaches.set(origin, {
      start: left,
      end: next,
      render
    })
    return next
  }

  private createChainByComponent(template: Component, left: Atom, depth: Depth): Atom {
    if (template.factory === Fragment) {
      return this.createChainByChildren(template.props?.children || [], left, depth)
    }
    const begin = new Atom(new JSXComponent(template, true), depth)
    left.next = begin
    const close = new Atom(new JSXComponent(template, false), depth)
    begin.next = close
    return close
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
    const {styleChanges, attrChanges, classesChanges, listenerChanges, isChanged} = getNodeChanges(newVNode, oldVNode)

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
}
