import { Injectable } from '@tanbo/di'

import {
  RootComponent,
  Component,
  JSXElement,
  JSXText,
  Ref,
  JSXComponent,
  JSXChildNode
} from '../model/_api'
import { NativeNode, NativeRenderer } from './injection-tokens'
import { classToString, getObjectChanges, refKey, styleToObject } from './_utils'

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

  render(): JSXChildNode
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
      component.rendered()
    } else if (component.changed) {
      const atom: Atom | null = this.componentAtomCaches.get(component)!.atom.child
      this.reconcileElement(atom, context)
      component.rendered()
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
          const {
            add,
            remove,
            replace
          } = getObjectChanges((start.jsxNode as Component).props, (reusedAtom.jsxNode as Component).props)
          if (add.length || remove.length || replace.length) {
            (reusedAtom.jsxNode as Component).invokePropsChangedHooks((start.jsxNode as Component).props)
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
          applyRefs()
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

    while (newAtom) {
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
        const ref = atom.jsxNode.props[refKey]
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
    // if (component.setup === Fragment) {
    //   const children = component.props.children
    //   return this.createChainByChildren(
    //     component,
    //     Array.isArray(children) ? children : [children],
    //     parent
    //   )
    // }
    return new Atom(component, parent)
  }

  private createChainByJSXElement(context: Component, element: JSXElement, parent: Atom) {
    const atom = new Atom(element, parent)
    if (Reflect.has(element.props, 'children')) {
      const jsxChildren = element.props.children
      const children = this.createChainByChildren(context, Array.isArray(jsxChildren) ? jsxChildren : [jsxChildren], atom)
      this.link(atom, children)
    }
    return atom
  }

  private createChainByJSXText(node: JSXText, parent: Atom) {
    return new Atom(node, parent)
  }

  private createChainByChildren(context: Component, children: JSXChildNode[], parent: Atom): Atom[] {
    const atoms: Atom[] = []
    for (const item of children) {
      if (item instanceof JSXElement) {
        atoms.push(this.createChainByJSXElement(context, item, parent))
        continue
      }
      if (item instanceof JSXComponent) {
        const childAtom = this.createChainByComponentFactory(context, item, parent)
        atoms.push(childAtom)
        continue
      }
      if (typeof item === 'string' && item.length) {
        atoms.push(this.createChainByJSXText(new JSXText(item), parent))
        continue
      }
      if (Array.isArray(item)) {
        atoms.push(...this.createChainByChildren(context, item, parent))
        continue
      }
      if (item !== null && typeof item !== 'undefined') {
        atoms.push(this.createChainByJSXText(new JSXText(String(item)), parent))
      }
    }
    return atoms
  }

  private linkTemplate(template: JSXChildNode, component: Component, parent: Atom) {
    const children = Array.isArray(template) ? template : [template]
    this.link(parent, this.createChainByChildren(component, children, parent))
  }

  private link(parent: Atom, children: Atom[]) {
    for (let i = 1; i < children.length; i++) {
      const prev = children[i - 1]
      prev.sibling = children[i]
    }
    parent.child = children[0] || null
  }

  private createElement(vNode: JSXElement) {
    const nativeNode = this.nativeRenderer.createElement(vNode.type)
    const props = vNode.props
    let bindingRefs: any

    const keys = Object.keys(props)
    for (const key of keys) {
      if (key === 'children') {
        continue
      }
      if (key === 'class') {
        this.nativeRenderer.setClass(nativeNode, classToString(props[key]))
        continue
      }
      if (key === 'style') {
        const style = styleToObject(props.style)
        Object.keys(style).forEach(key => {
          this.nativeRenderer.setStyle(nativeNode, key, style[key])
        })
        continue
      }
      if (/^on[A-Z]/.test(key)) {
        const listener = props[key]
        if (typeof listener === 'function') {
          this.nativeRenderer.listen(nativeNode, key.replace(/^on/, '').toLowerCase(), listener)
        }
        continue
      }
      if (key === refKey) {
        bindingRefs = props[key]
        continue
      }
      this.nativeRenderer.setProperty(nativeNode, key, props[key])
    }
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
    const changes = getObjectChanges(newVNode.props, oldVNode.props)
    let unBindRefs: any
    let bindRefs: any

    for (const [key, value] of changes.remove) {
      if (key === 'children') {
        continue
      }
      if (key === 'class') {
        this.nativeRenderer.setClass(nativeNode, '')
        continue
      }
      if (key === 'style') {
        Object.keys(styleToObject(value)).forEach(styleName => {
          this.nativeRenderer.removeStyle(nativeNode, styleName)
        })
        continue
      }
      if (/^on[A-Z]/.test(key)) {
        if (typeof value === 'function') {
          this.nativeRenderer.unListen(nativeNode, key.replace(/^on/, '').toLowerCase(), value)
        }
        continue
      }
      if (key === refKey) {
        unBindRefs = value
        continue
      }
      this.nativeRenderer.removeProperty(nativeNode, key)
    }

    for (const [key, newValue, oldValue] of changes.replace) {
      if (key === 'children') {
        continue
      }
      if (key === 'class') {
        const oldClassName = classToString(oldValue)
        const newClassName = classToString(newValue)
        if (oldClassName !== newClassName) {
          this.nativeRenderer.setClass(nativeNode, newClassName)
        }
        continue
      }
      if (key === 'style') {
        const styleChanges = getObjectChanges(styleToObject(newValue) || {}, styleToObject(oldValue) || {})
        for (const [styleName] of styleChanges.remove) {
          this.nativeRenderer.removeStyle(nativeNode, styleName)
        }
        for (const [styleName, styleValue] of [...styleChanges.add, ...styleChanges.replace]) {
          this.nativeRenderer.setStyle(nativeNode, styleName, styleValue)
        }
        continue
      }
      if (/^on[A-Z]/.test(key)) {
        const listenType = key.replace(/^on/, '').toLowerCase()
        if (typeof oldValue === 'function') {
          this.nativeRenderer.unListen(nativeNode, listenType, oldValue)
        }
        if (typeof newValue === 'function') {
          this.nativeRenderer.listen(nativeNode, listenType, newValue)
        }
        continue
      }
      if (key === refKey) {
        unBindRefs = oldValue
        bindRefs = newValue
        continue
      }
      this.nativeRenderer.setProperty(nativeNode, key, newValue)
    }

    for (const [key, value] of changes.add) {
      if (key === 'children') {
        continue
      }
      if (key === 'class') {
        this.nativeRenderer.setClass(nativeNode, classToString(value))
        continue
      }
      if (key === 'style') {
        const styleObj = styleToObject(value)
        Object.keys(styleObj).forEach(styleName => {
          this.nativeRenderer.setStyle(nativeNode, styleName, styleObj[styleName])
        })
        continue
      }
      if (/^on[A-Z]/.test(key)) {
        if (typeof value === 'function') {
          this.nativeRenderer.listen(nativeNode, key.replace(/^on/, '').toLowerCase(), value)
        }
        continue
      }
      if (key === refKey) {
        bindRefs = value
        continue
      }
      this.nativeRenderer.setProperty(nativeNode, key, value)
    }

    return () => {
      this.applyRefs(unBindRefs, nativeNode, false)
      this.applyRefs(bindRefs!, nativeNode, true)
    }
  }

  private applyRefs(refs: any, nativeNode: NativeNode, binding: boolean) {
    const refList: any[] = Array.isArray(refs) ? refs : [refs]
    for (const item of refList) {
      if (item instanceof Ref) {
        binding ? item.bind(nativeNode) : item.unBind(nativeNode)
      }
    }
  }
}
