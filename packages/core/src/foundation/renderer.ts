import { Injectable } from '@tanbo/di'

import {
  RootComponent,
  Component,
  JSXElement,
  JSXText,
  VNode,
  Fragment,
  Ref,
  JSXTemplate,
  JSXComponent
} from '../model/_api'
import { NativeNode, NativeRenderer } from './injection-tokens'
import { getNodeChanges, refKey } from './_utils'

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

  render(): JSXTemplate
}

interface DiffContext {
  host: NativeNode,
  isParent: boolean
}

@Injectable()
export class Renderer {
  private componentAtomCaches = new WeakMap<Component, ComponentView>()

  constructor(private nativeRenderer: NativeRenderer,
              private rootComponentRef: RootComponentRef) {
  }

  render() {
    const { component, host } = this.rootComponentRef
    const atom = new Atom(component, null)
    this.buildView(atom, {
      isParent: true,
      host
    })
  }

  refresh() {
    const { component, host } = this.rootComponentRef
    this.reconcile(component, {
      host,
      isParent: true
    })
  }

  private reconcile(component: Component, context: DiffContext) {
    if (component.dirty) {
      this.applyChanges(component, context)
    } else if (component.changed) {
      const atom: Atom | null = this.componentAtomCaches.get(component)!.atom.child
      this.reconcileElement(atom, context)
    } else {
      const prevSibling = this.getPrevSibling(component)
      if (prevSibling) {
        context.isParent = false
        context.host = prevSibling
      }
    }
  }

  private getPrevSibling(component: Component) {
    let atom: Atom | null = this.componentAtomCaches.get(component)!.atom.child
    const childAtoms: Atom[] = []

    while (atom) {
      childAtoms.push(atom)
      atom = atom.sibling
    }
    const components: Component[] = []
    while (childAtoms.length) {
      const last = childAtoms.pop()!
      if (last.jsxNode instanceof Component) {
        components.push(last.jsxNode)
        continue
      }
      return last.nativeNode
    }
    for (const component of components) {
      const nativeNode = this.getPrevSibling(component)
      if (nativeNode) {
        return nativeNode
      }
    }
    return null
  }

  private reconcileElement(atom: Atom | null, context: DiffContext) {
    while (atom) {
      if (atom.jsxNode instanceof Component) {
        this.reconcile(atom.jsxNode, context)
        atom = atom.sibling
        continue
      }
      if (atom.jsxNode instanceof JSXElement) {
        this.reconcileElement(atom.child, {
          host: atom.nativeNode!,
          isParent: true
        })
        context.host = atom.nativeNode!
        context.isParent = false
      }
      atom = atom.sibling
    }
  }

  private applyChanges(component: Component, context: DiffContext) {
    const { atom, render } = this.componentAtomCaches.get(component)!
    const diffAtom = atom.child
    const template = render()
    if (template) {
      this.linkTemplate(template, component, atom)
    } else {
      atom.child = null
    }

    this.diff(atom.child, diffAtom, context)
    component.rendered()
  }

  private diff(start: Atom | null, diffAtom: Atom | null, context: DiffContext) {
    const oldChildren: Array<{index: number, atom: Atom}> = []
    let index = 0
    while (diffAtom) {
      oldChildren.push({
        index,
        atom: diffAtom
      })
      diffAtom = diffAtom.sibling
      index++
    }

    const commits: Array<() => void> = []

    const addUpdateCommit = (start: Atom, reusedAtom: Atom) => {
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
        } else if (reusedAtom.child) {
          let atom: Atom | null = reusedAtom.child
          while (atom) {
            this.cleanView(atom, false)
            atom = atom.sibling
          }
        }
        if (isComponent) {
          (start.jsxNode as Component).rendered()
        }
      })
    }

    const addCreateCommit = (start: Atom) => {
      commits.push(() => {
        this.buildView(start, context)
      })
    }

    let i = 0
    while (start && !start.nativeNode) {
      const reusedAtom = this.reuseAndUpdate(start, i, oldChildren)
      if (reusedAtom) {
        addUpdateCommit(start, reusedAtom)
      } else {
        addCreateCommit(start)
      }
      i++
      start = start.sibling
    }
    for (const item of oldChildren) {
      this.cleanView(item.atom, false)
    }

    for (const commit of commits) {
      commit()
    }
  }

  private cleanView(atom: Atom, isClean: boolean) {
    if (atom.nativeNode) {
      if (!isClean) {
        this.nativeRenderer.remove(atom.nativeNode)
        isClean = true
      }
      if (atom.jsxNode instanceof JSXElement) {
        const ref = atom.jsxNode.props.attrs.get(refKey)
        this.applyRefs(ref, atom.nativeNode, false)
      }
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

  private reuseAndUpdate(start: Atom, lastIndex: number, oldChildren: Array<{index: number; atom: Atom}>) {
    let isReuse = false
    for (let i = 0; i < oldChildren.length; i++) {
      const { atom: diffAtom, index: diffIndex } = oldChildren[i]
      const key = (start.jsxNode as any).key
      const diffKey = (diffAtom.jsxNode as any).key

      if (key !== undefined && diffKey !== undefined) {
        if (diffKey !== key) {
          continue
        }
        isReuse = lastIndex > diffIndex
      }
      if (start.jsxNode instanceof JSXElement) {
        if (diffAtom.jsxNode instanceof JSXElement && start.jsxNode.name === diffAtom.jsxNode.name) {
          const nativeNode = diffAtom.nativeNode!
          if (isReuse) {
            this.nativeRenderer.remove(nativeNode)
          }
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
        if (start.jsxNode.setup === diffAtom.jsxNode.setup) {
          if (isReuse) {
            this.temporarilyRemove(diffAtom)
          }
          const { isChanged } = getNodeChanges(start.jsxNode, diffAtom.jsxNode)
          if (isChanged) {
            diffAtom.jsxNode.invokePropsChangedHooks(start.jsxNode.config)
          }
          const newProps = start.jsxNode.props
          start.jsxNode = diffAtom.jsxNode
          start.jsxNode.props = newProps
          const { render } = this.componentAtomCaches.get(start.jsxNode)!
          const template = render()
          if (template) {
            this.linkTemplate(template, start.jsxNode, start)
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

  private temporarilyRemove(atom: Atom) {
    let next = atom.child
    while (next) {
      if (next.jsxNode instanceof Component) {
        this.temporarilyRemove(next)
      } else {
        this.nativeRenderer.remove(next.nativeNode!)
      }
      next = next.sibling
    }
  }

  private buildView(atom: Atom, context: DiffContext) {
    if (atom.jsxNode instanceof Component) {
      this.componentRender(atom.jsxNode, atom)
      let child = atom.child
      while (child) {
        this.buildView(child, context)
        child = child.sibling
      }
      atom.jsxNode.rendered()
    } else {
      let nativeNode: NativeNode
      if (atom.jsxNode instanceof JSXElement) {
        nativeNode = this.createElement(atom.jsxNode)
        const childContext = {
          isParent: true,
          host: nativeNode
        }
        let child = atom.child
        while (child) {
          this.buildView(child, childContext)
          child = child.sibling
        }
      } else {
        nativeNode = this.createTextNode(atom.jsxNode)
      }
      atom.nativeNode = nativeNode
      if (context.isParent) {
        this.nativeRenderer.prependChild(context.host, nativeNode)
      } else {
        this.nativeRenderer.insertAfter(nativeNode, context.host)
      }
      context.host = nativeNode
      context.isParent = false
    }
  }

  private componentRender(component: Component, from: Atom) {
    const { template, render } = component.init()
    if (template) {
      this.linkTemplate(template, component, from)
    }
    this.componentAtomCaches.set(component, {
      render,
      atom: from
    })
    return from
  }

  private createChainByComponentFactory(context: Component, factory: JSXComponent, parent: Atom) {
    const component = factory.createInstance(context)
    if (component.setup === Fragment) {
      return this.createChainByChildren(component, component.props.children, parent)
    }
    return new Atom(component, parent)
  }

  private createChain(context: Component, template: JSXElement | JSXComponent | JSXText, parent: Atom) {
    if (template instanceof JSXElement) {
      return this.createChainByJSXElement(context, template, parent)
    }
    if (template instanceof JSXText) {
      return this.createChainByJSXText(template, parent)
    }
    return this.createChainByComponentFactory(context, template, parent)
  }

  private createChainByJSXElement(context: Component, element: JSXElement, parent: Atom) {
    const atom = new Atom(element, parent)
    const children = this.createChainByChildren(context, element.props.children, atom)
    this.link(atom, children)
    return atom
  }

  private createChainByJSXText(node: JSXText, parent: Atom) {
    return new Atom(node, parent)
  }

  private createChainByChildren(context: Component, children: VNode[], parent: Atom): Atom[] {
    const atoms: Atom[] = []
    for (const item of children) {
      const child = this.createChain(context, item, parent)
      if (Array.isArray(child)) {
        atoms.push(...child)
      } else {
        atoms.push(child)
      }
    }
    return atoms
  }

  private linkTemplate(template: JSXElement | JSXComponent | JSXText, component: Component, parent: Atom) {
    if (template) {
      const child = this.createChain(component, template, parent)
      this.link(parent, Array.isArray(child) ? child : [child])
    }
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
      let bindingRefs: any
      props.attrs.forEach((value, key) => {
        if (key === refKey) {
          bindingRefs = value
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

      this.applyRefs(bindingRefs, nativeNode, true)
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

    styleChanges.remove.forEach(i => this.nativeRenderer.removeStyle(nativeNode, i[0]))
    styleChanges.set.forEach(i => this.nativeRenderer.setStyle(nativeNode, i[0], i[1]))

    let unBindRefs: any
    attrChanges.remove.forEach(([key, value]) => {
      if (key === refKey) {
        unBindRefs = value
        return
      }
      this.nativeRenderer.removeProperty(nativeNode, key)
    })
    let bindRefs: any
    attrChanges.set.forEach(([key, value]) => {
      if (key === refKey) {
        bindRefs = value
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
    this.applyRefs(unBindRefs, nativeNode, false)
    this.applyRefs(bindRefs!, nativeNode, true)
  }

  private applyRefs(refs: any, nativeNode: NativeNode, binding: boolean) {
    refs = Array.isArray(refs) ? refs : [refs]
    for (const item of refs) {
      if (item instanceof Ref) {
        binding ? item.bind(nativeNode) : item.unBind(nativeNode)
      }
    }
  }
}
