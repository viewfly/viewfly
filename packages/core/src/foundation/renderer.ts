import { Injectable } from '@tanbo/di'
import { microTask, Subscription } from '@tanbo/stream'

import { RootComponent, Component, JSXFragment, JSXElement, JSXText, VNode, Fragment, Ref } from '../model/_api'
import { makeError } from '../_utils/make-error'
import { NativeNode, NativeRenderer } from './injection-tokens'
import { getNodeChanges } from './_utils'

const rendererErrorFn = makeError('Renderer')

export abstract class RootComponentRef {
  abstract component: RootComponent
  abstract host: NativeNode
}

class Atom {
  nativeNode: NativeNode | null = null
  child: Atom | null = null
  sibling: Atom | null = null

  constructor(
    public jsxNode: JSXElement | JSXText | Component,
    public parent: Atom | null
  ) {
  }
}

interface ComponentView {
  atom: Atom

  render(): JSXElement | Component | JSXFragment
}

interface DiffContext {
  host: NativeNode,
  isParent: boolean
}

@Injectable()
export class Renderer {
  private componentAtomCaches = new WeakMap<Component, ComponentView>()

  private subscription = new Subscription()


  constructor(private nativeRenderer: NativeRenderer,
              private rootComponentRef: RootComponentRef) {
  }

  render() {
    const { component, host } = this.rootComponentRef
    const chain = new Atom(component, null)
    const children = this.buildView(chain)
    children.forEach(child => {
      this.nativeRenderer.appendChild(host, child)
    })
    this.subscription.add(
      component.changeEmitter.pipe(
        microTask()
      ).subscribe(() => {
        console.time()
        this.reconcile(component, {
          host,
          isParent: true
        })
        console.timeEnd()
      })
    )
  }

  private reconcile(component: Component, context: DiffContext) {
    if (component.dirty) {
      this.applyChanges(component, context)
    } else if (component.changed) {
      let atom: Atom | null = this.componentAtomCaches.get(component)!.atom.child
      while (atom) {
        if (atom.jsxNode instanceof Component) {
          this.reconcile(atom.jsxNode, context)
          atom = atom.sibling
          continue
        }
        if (atom.child) {
          if (atom.jsxNode instanceof JSXElement) {
            context.host = atom.nativeNode!
            context.isParent = false
          }
          atom = atom.child
          continue
        }
        while (atom) {
          if (atom.sibling) {
            atom = atom.sibling
            break
          }
          atom = atom.parent
        }
      }
    }
  }


  private applyChanges(component: Component, context: DiffContext) {
    const { atom, render } = this.componentAtomCaches.get(component)!
    const diffAtom = atom.child
    const template = render()
    if (template) {
      const child = this.createChain(template, atom)
      this.link(atom, Array.isArray(child) ? child : [child])
    }

    this.diff(atom.child, diffAtom, context)
  }

  private diff(start: Atom | null, diffAtom: Atom | null, context: DiffContext) {
    const oldChildren: Atom[] = []
    while (diffAtom) {
      oldChildren.push(diffAtom)
      diffAtom = diffAtom.sibling
    }

    const commits: Array<() => void> = []

    const addReuseCommit = (start: Atom, reusedAtom: Atom) => {
      commits.push(() => {
        const isComponent = start.jsxNode instanceof Component
        if (!isComponent) {
          const host = context.host
          if (context.isParent) {
            this.nativeRenderer.prependChild(host, start.nativeNode!)
          } else {
            this.nativeRenderer.insertAfter(start.nativeNode!, host)
          }
          context.host = start.nativeNode!
          context.isParent = false
        }
        if (start.child) {
          const childContext = start.jsxNode instanceof JSXElement ? {
            host: start.nativeNode!,
            isParent: true
          } : context

          this.diff(start.child, reusedAtom.child, childContext)
        }
        if (isComponent) {
          (start.jsxNode as Component).invokeUpdatedHooks()
        }
      })
    }

    const addCreateCommit = (start: Atom) => {
      commits.push(() => {
        const children = this.createViewByAtom(start)
        children.forEach(child => {
          if (context.isParent) {
            this.nativeRenderer.prependChild(context.host, child)
          } else {
            this.nativeRenderer.insertAfter(child, context.host)
          }
          context.host = child
          context.isParent = false
        })
      })
    }

    while (start && !start.nativeNode) {
      const reusedAtom = this.reuseAndUpdate(start, oldChildren)
      if (reusedAtom) {
        addReuseCommit(start, reusedAtom)
      } else {
        addCreateCommit(start)
      }
      start = start.sibling
    }
    for (const atom of oldChildren) {
      this.cleanView(atom, false)
    }

    for (const commit of commits) {
      commit()
    }
  }

  private cleanView(atom: Atom, isClean: boolean) {
    if (!isClean && atom.nativeNode) {
      this.nativeRenderer.remove(atom.nativeNode)
      isClean = true
    }

    let child = atom.child
    while (child) {
      this.cleanView(child, isClean)
      child = child.sibling
    }

    if (atom.jsxNode instanceof Component) {
      atom.jsxNode.destroy()
    }
  }

  private reuseAndUpdate(start: Atom, oldChildren: Atom[]) {
    for (let i = 0; i < oldChildren.length; i++) {
      const diffAtom = oldChildren[i]
      if (start.jsxNode instanceof JSXElement) {
        if (diffAtom.jsxNode instanceof JSXElement && start.jsxNode.name === diffAtom.jsxNode.name) {
          const nativeNode = diffAtom.nativeNode!
          start.nativeNode = nativeNode
          this.updateNativeNodeProperties(start.jsxNode, diffAtom.jsxNode, nativeNode)
          oldChildren.splice(i, 1)
          return diffAtom
        }
      } else if (start.jsxNode instanceof JSXText) {
        if (diffAtom.jsxNode instanceof JSXText) {
          const nativeNode = diffAtom.nativeNode!
          if (start.jsxNode.text !== diffAtom.jsxNode.text) {
            this.nativeRenderer.syncTextContent(nativeNode, start.jsxNode.text)
          }
          start.nativeNode = nativeNode
          oldChildren.splice(i, 1)
          return diffAtom
        }
      } else if (diffAtom.jsxNode instanceof Component) {
        if (start.jsxNode.factory === diffAtom.jsxNode.factory) {
          const { isChanged } = getNodeChanges(start.jsxNode, diffAtom.jsxNode)
          start.jsxNode = diffAtom.jsxNode
          if (isChanged) {
            start.jsxNode.invokePropsChangedHooks(start.jsxNode.config)
          }
          const { render } = this.componentAtomCaches.get(start.jsxNode)!
          const template = render()
          if (template) {
            const child = this.createChain(template, start)
            this.link(start, Array.isArray(child) ? child : [child])
          }
          this.componentAtomCaches.set(start.jsxNode, {
            render,
            atom: start
          })
          oldChildren.splice(i, 1)
          return diffAtom
        }
      }
    }
    return null
  }


  private createViewByAtom(atom: Atom) {
    if (atom.jsxNode instanceof JSXElement) {
      const nativeNode = this.createElement(atom.jsxNode)
      atom.nativeNode = nativeNode
      if (atom.child) {
        const children = this.buildView(atom.child)
        for (const child of children) {
          this.nativeRenderer.appendChild(nativeNode, child)
        }
      }
      return [nativeNode]
    } else if (atom.jsxNode instanceof JSXText) {
      const nativeNode = this.createTextNode(atom.jsxNode)
      atom.nativeNode = nativeNode
      return [nativeNode]
    }
    const { template, render } = atom.jsxNode.setup()
    this.componentAtomCaches.set(atom.jsxNode, {
      atom,
      render
    })
    if (template) {
      const child = this.createChain(template, atom)
      this.link(atom, Array.isArray(child) ? child : [child])
    }
    if (atom.child) {
      return this.buildView(atom.child)
    }
    return []
  }

  private buildView(chain: Atom) {
    const context: NativeNode[] = []
    const children: NativeNode[] = []

    function getContext() {
      return context[context.length - 1]
    }

    let atom: Atom | null = chain

    const stopAtom = chain.parent

    while (atom) {
      if (atom.jsxNode instanceof Component) {
        this.componentRender(atom.jsxNode, atom)
        atom = atom.child || atom.sibling || atom.parent
        if (atom === stopAtom) {
          break
        }
        continue
      }

      const host = getContext()

      const nativeNode = atom.jsxNode instanceof JSXElement ? this.createElement(atom.jsxNode) : this.createTextNode(atom.jsxNode)
      atom.nativeNode = nativeNode

      if (host) {
        this.nativeRenderer.appendChild(host, nativeNode)
      } else {
        children.push(nativeNode)
      }
      if (atom.child) {
        context.push(nativeNode)
        atom = atom.child
        continue
      }
      while (atom) {
        if (atom.sibling) {
          atom = atom.sibling
          break
        }
        atom = atom.parent
        if (atom === stopAtom) {
          return children
        }
        if (atom?.jsxNode instanceof Component) {
          // atom.jsxNode.rendered()
          continue
        }
        context.pop()
      }
    }
    return children
  }

  private componentRender(component: Component, parent: Atom) {
    const { template, render } = component.setup()
    if (template) {
      const child = this.createChain(template, parent)
      this.link(parent, Array.isArray(child) ? child : [child])
    }
    this.componentAtomCaches.set(component, {
      render,
      atom: parent
    })
    return parent
  }

  private createChainByComponent(component: Component, parent: Atom) {
    if (component.factory === Fragment) {
      return this.createChainByChildren(component.props?.children || [], parent)
    }
    return new Atom(component, parent)
  }

  private createChain(template: JSXElement | Component | JSXText | JSXFragment, parent: Atom) {
    if (template instanceof JSXElement) {
      return this.createChainByJSXElement(template, parent)
    }
    if (template instanceof Component) {
      return this.createChainByComponent(template, parent)
    }
    if (template instanceof JSXFragment) {
      return this.createChainByChildren(template.props?.children || [], parent)
    }
    return this.createChainByJSXText(template, parent)
  }

  private createChainByJSXElement(element: JSXElement, parent: Atom) {
    const atom = new Atom(element, parent)
    if (element.props?.children) {
      const children = this.createChainByChildren(element.props.children || [], atom)
      this.link(atom, children)
    }
    return atom
  }

  private createChainByJSXText(node: JSXText, parent: Atom) {
    return new Atom(node, parent)
  }

  private createChainByChildren(children: VNode[], parent: Atom): Atom[] {
    const atoms: Atom[] = []
    for (const item of children) {
      const child = this.createChain(item, parent)
      if (Array.isArray(child)) {
        atoms.push(...child)
      } else {
        atoms.push(child)
      }
    }
    return atoms
  }

  private link(parent: Atom, children: Atom[]) {
    for (let i = 1; i < children.length; i++) {
      const prev = children[i - 1]
      prev.sibling = children[i]
    }
    parent.child = children[0] || null
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
}
