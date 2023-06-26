import { Injectable } from '@tanbo/di'

import {
  RootComponent,
  Component,
  JSXElement,
  JSXText,
  JSXNode,
  Fragment,
  Ref,
  JSXTemplate,
  JSXComponent
} from '../model/_api'
import { NativeNode, NativeRenderer } from './injection-tokens'
import { getMapChanges, getNodeChanges, getObjectChanges, refKey } from './_utils'

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

interface ChangeCommits {
  reuseElement(newAtom: Atom, oldAtom: Atom, expectIndex: number, diffIndex: number): void

  reuseText(newAtom: Atom, oldAtom: Atom): void

  reuseComponent(newAtom: Atom, oldAtom: Atom, expectIndex: number, diffIndex: number): void

  create(atom: Atom): void
}

interface DiffAtomIndexed {
  atom: Atom
  index: number
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

    this.diff(atom.child, diffAtom, context, 0, 0)
    component.rendered()
  }

  private diff(newAtom: Atom | null, oldAtom: Atom | null, context: DiffContext, expectIndex: number, index: number) {
    const oldChildren: DiffAtomIndexed[] = []
    while (oldAtom) {
      oldChildren.push({
        index,
        atom: oldAtom
      })
      oldAtom = oldAtom.sibling
      index++
    }

    const commits: Array<(offset: number) => void> = []

    const changeCommits: ChangeCommits = {
      reuseComponent: (start: Atom, reusedAtom: Atom, expectIndex: number, diffIndex: number) => {
        commits.push(() => {
          const { isChanged } = getNodeChanges(start.jsxNode as Component, reusedAtom.jsxNode as Component)
          if (isChanged) {
            (reusedAtom.jsxNode as Component).invokePropsChangedHooks((start.jsxNode as Component).config)
          }
          const newProps = (start.jsxNode as Component).props
          start.jsxNode = reusedAtom.jsxNode as Component
          (start.jsxNode as Component).props = newProps
          const { render } = this.componentAtomCaches.get(start.jsxNode as Component)!
          const template = render()
          if (template) {
            this.linkTemplate(template, start.jsxNode, start)
          }
          this.componentAtomCaches.set(start.jsxNode, {
            render,
            atom: start
          })
          if (start.child) {
            this.diff(start.child, reusedAtom.child, context, expectIndex, diffIndex)
          } else if (reusedAtom.child) {
            let atom: Atom | null = reusedAtom.child
            while (atom) {
              this.cleanView(atom, false)
              atom = atom.sibling
            }
          }
          (start.jsxNode as Component).rendered()
        })
      },
      reuseElement: (newAtom: Atom, oldAtom: Atom, expectIndex: number, oldIndex: number) => {
        commits.push((offset: number) => {
          newAtom.nativeNode = oldAtom.nativeNode
          const host = context.host
          if (expectIndex !== oldIndex - offset) {
            if (context.isParent) {
              this.nativeRenderer.prependChild(host, newAtom.nativeNode!)
            } else {
              this.nativeRenderer.insertAfter(newAtom.nativeNode!, host)
            }
          }
          context.host = newAtom.nativeNode!
          context.isParent = false
          const applyRefs = this.updateNativeNodeProperties(
            newAtom.jsxNode as JSXElement,
            oldAtom.jsxNode as JSXElement,
            newAtom.nativeNode!)

          if (newAtom.child) {
            this.diff(newAtom.child, oldAtom.child, {
              host: newAtom.nativeNode!,
              isParent: true
            }, 0, 0)
          } else if (oldAtom.child) {
            let atom: Atom | null = oldAtom.child
            while (atom) {
              this.cleanView(atom, false)
              atom = atom.sibling
            }
          }
          if (applyRefs) {
            applyRefs()
          }
        })
      },
      reuseText: (newAtom: Atom, oldAtom: Atom) => {
        commits.push(() => {
          const nativeNode = oldAtom.nativeNode!
          if ((newAtom.jsxNode as JSXText).text !== (oldAtom.jsxNode as JSXText).text) {
            this.nativeRenderer.syncTextContent(nativeNode, (newAtom.jsxNode as JSXText).text)
          }
          newAtom.nativeNode = nativeNode
          context.host = nativeNode
          context.isParent = false
        })
      },
      create: (start: Atom) => {
        commits.push(() => {
          this.buildView(start, context)
        })
      }
    }

    while (newAtom && !newAtom.nativeNode) {
      this.createChanges(newAtom, expectIndex, oldChildren, changeCommits)
      newAtom = newAtom.sibling
      expectIndex++
    }
    for (const item of oldChildren) {
      this.cleanView(item.atom, false)
    }

    let j = 0
    let offset = 0
    const len = oldChildren.length
    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i]
      while (j < len) {
        const current = oldChildren[j]
        if (current.index <= i) {
          offset++
          j++
          continue
        }
        break
      }
      commit(offset)
    }
  }

  private createChanges(newAtom: Atom, expectIndex: number, oldChildren: DiffAtomIndexed[], changeCommits: ChangeCommits) {
    for (let i = 0; i < oldChildren.length; i++) {
      const { atom: diffAtom, index: diffIndex } = oldChildren[i]
      const key = (newAtom.jsxNode as any).key
      const diffKey = (diffAtom.jsxNode as any).key

      if (key !== undefined && diffKey !== undefined) {
        if (diffKey !== key) {
          continue
        }
      }
      if (newAtom.jsxNode.is(diffAtom.jsxNode)) {
        if (newAtom.jsxNode instanceof JSXElement) {
          changeCommits.reuseElement(newAtom, diffAtom, expectIndex, diffIndex)
        } else if (newAtom.jsxNode instanceof JSXText) {
          changeCommits.reuseText(newAtom, diffAtom)
        } else {
          changeCommits.reuseComponent(newAtom, diffAtom, expectIndex, diffIndex)
        }
        oldChildren.splice(i, 1)
        return
      }
    }
    changeCommits.create(newAtom)
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
      let applyRefs: null | (() => void) = null
      if (atom.jsxNode instanceof JSXElement) {
        const { nativeNode: n, applyRefs: a } = this.createElement(atom.jsxNode)
        nativeNode = n
        applyRefs = a
      } else {
        nativeNode = this.createTextNode(atom.jsxNode)
      }
      atom.nativeNode = nativeNode
      if (context.isParent) {
        this.nativeRenderer.prependChild(context.host, nativeNode)
      } else {
        this.nativeRenderer.insertAfter(nativeNode, context.host)
      }
      if (atom.jsxNode instanceof JSXElement) {
        const childContext = {
          isParent: true,
          host: nativeNode
        }
        let child = atom.child
        while (child) {
          this.buildView(child, childContext)
          child = child.sibling
        }
      }
      context.host = nativeNode
      context.isParent = false
      if (applyRefs) {
        applyRefs()
      }
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

  private createChainByChildren(context: Component, children: JSXNode[], parent: Atom): Atom[] {
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
    if (props.classes) {
      this.nativeRenderer.setClass(nativeNode, props.classes)
    }

    Object.keys(props.listeners).forEach(type => {
      this.nativeRenderer.listen(nativeNode, type, props.listeners[type])
    })

    return {
      nativeNode,
      applyRefs: () => {
        this.applyRefs(bindingRefs, nativeNode, true)
      }
    }
  }

  private createTextNode(child: JSXText) {
    return this.nativeRenderer.createTextNode(child.text)
  }

  private updateNativeNodeProperties(newVNode: JSXElement, oldVNode: JSXElement, nativeNode: NativeNode) {
    const newProps = newVNode.props
    const oldProps = oldVNode.props
    const styleChanges = getMapChanges(newProps.styles, oldProps.styles)
    const attrChanges = getMapChanges(newProps.attrs, oldProps.attrs)
    const listenerChanges = getObjectChanges(newProps.listeners, oldProps.listeners)

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

    if (newProps.classes !== oldProps.classes) {
      this.nativeRenderer.setClass(nativeNode, newProps.classes)
    }

    listenerChanges.remove.forEach(i => {
      this.nativeRenderer.unListen(nativeNode, i[0], i[1])
    })
    listenerChanges.add.forEach(i => {
      this.nativeRenderer.listen(nativeNode, i[0], i[1])
    })
    return () => {
      this.applyRefs(unBindRefs, nativeNode, false)
      this.applyRefs(bindRefs!, nativeNode, true)
    }
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
