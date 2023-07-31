import { Injectable } from '../di/_api'

import { NativeNode, NativeRenderer } from './injection-tokens'
import { classToString, getObjectChanges, ListenDelegate, refKey, styleToObject, Atom } from './_utils'
import { RootComponent } from './root.component'
import { JSXElement, JSXText } from './jsx-element'
import { Component, JSXComponent, Ref } from './component'
import { JSXInternal } from './types'

export abstract class RootComponentRef {
  abstract component: RootComponent
}

export abstract class HostRef {
  abstract host: NativeNode
}

interface DiffContext {
  host: NativeNode,
  isParent: boolean
}

interface ChangeCommits {
  updateElement(newAtom: Atom, oldAtom: Atom, expectIndex: number, diffIndex: number): void

  updateText(newAtom: Atom, oldAtom: Atom): void

  updateComponent(newAtom: Atom, oldAtom: Atom, expectIndex: number, diffIndex: number): void

  create(atom: Atom): void
}

interface DiffAtomIndexed {
  atom: Atom
  index: number
}

@Injectable()
export class Renderer {
  private isInit = true

  constructor(private nativeRenderer: NativeRenderer,
              private rootComponentRef: RootComponentRef,
              private hostRef: HostRef) {
  }

  render() {
    const component = this.rootComponentRef.component
    const host = this.hostRef.host
    if (this.isInit) {
      const atom: Atom = {
        jsxNode: component,
        parent: null,
        sibling: null,
        child: null,
        nativeNode: null
      }
      this.buildView(atom, {
        isParent: true,
        host
      })
    } else {
      this.reconcile(component, {
        host,
        isParent: true
      })
    }
    this.isInit = false
  }

  private reconcile(component: Component, context: DiffContext) {
    if (component.dirty) {
      this.applyChanges(component, context)
      component.rendered()
    } else if (component.changed) {
      const atom: Atom | null = component.$$view.atom.child
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
    let atom: Atom | null = component.$$view.atom.child
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
    const { atom, render } = component.$$view
    const diffAtom = atom.child
    const template = render(component.props, component.props)
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
      updateComponent: (newAtom: Atom, reusedAtom: Atom, expectIndex: number, diffIndex: number) => {
        commits.push((offset) => {
          const { render, template } = (reusedAtom.jsxNode as Component).$$view

          const newProps = (newAtom.jsxNode as Component).props
          const oldProps = (reusedAtom.jsxNode as Component).props
          newAtom.jsxNode = reusedAtom.jsxNode as Component
          const newTemplate = render(newProps, oldProps);
          (newAtom.jsxNode as Component).$$view = {
            render,
            template: newTemplate,
            atom: newAtom
          }
          if (newTemplate === template) {
            this.reuseComponentView(newAtom, reusedAtom, context, expectIndex !== diffIndex - offset)
            return
          }
          if (newTemplate) {
            this.linkTemplate(newTemplate, newAtom.jsxNode, newAtom)
          }
          if (newAtom.child) {
            this.diff(newAtom.child, reusedAtom.child, context, expectIndex, diffIndex)
          } else if (reusedAtom.child) {
            let atom: Atom | null = reusedAtom.child
            while (atom) {
              this.cleanView(atom, false)
              atom = atom.sibling
            }
          }
          (newAtom.jsxNode as Component).rendered()
        })
      },
      updateElement: (newAtom: Atom, oldAtom: Atom, expectIndex: number, oldIndex: number) => {
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
      updateText: (newAtom: Atom, oldAtom: Atom) => {
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

  private reuseComponentView(newAtom: Atom, reusedAtom: Atom, context: DiffContext, moveView: boolean) {
    let child = reusedAtom.child
    newAtom.child = child
    const children: Atom[] = []
    while (child) {
      children.push(child)
      child.parent = newAtom
      child = child.sibling
    }

    const updateContext = (atom: Atom) => {
      if (atom.jsxNode instanceof Component) {
        let child = atom.child
        while (child) {
          updateContext(child)
          child = child.sibling
        }
      } else {
        if (moveView) {
          if (context.isParent) {
            this.nativeRenderer.prependChild(context.host, atom.nativeNode!)
          } else {
            this.nativeRenderer.insertAfter(atom.nativeNode!, context.host)
          }
        }
        context.isParent = false
        context.host = atom.nativeNode!
      }
    }

    for (const atom of children) {
      updateContext(atom)
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
          changeCommits.updateElement(newAtom, diffAtom, expectIndex, diffIndex)
        } else if (newAtom.jsxNode instanceof JSXText) {
          changeCommits.updateText(newAtom, diffAtom)
        } else {
          changeCommits.updateComponent(newAtom, diffAtom, expectIndex, diffIndex)
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
    const { template, render } = component.setup()
    if (template) {
      this.linkTemplate(template, component, from)
    }
    component.$$view = {
      render,
      template,
      atom: from
    }
    return from
  }

  private createChainByComponentFactory(context: Component, factory: JSXComponent, parent: Atom): Atom {
    const component = factory.createInstance(context)
    return {
      jsxNode: component,
      parent,
      sibling: null,
      child: null,
      nativeNode: null
    }
  }

  private createChainByJSXElement(context: Component, element: JSXElement, parent: Atom) {
    const atom: Atom = {
      jsxNode: element,
      parent,
      sibling: null,
      child: null,
      nativeNode: null
    }
    if (Reflect.has(element.props, 'children')) {
      const jsxChildren = element.props.children
      const children = this.createChainByChildren(context, Array.isArray(jsxChildren) ? jsxChildren : [jsxChildren], atom, [])
      this.link(atom, children)
    }
    return atom
  }

  private createChainByJSXText(node: JSXText, parent: Atom): Atom {
    return {
      jsxNode: node,
      parent,
      sibling: null,
      child: null,
      nativeNode: null
    }
  }

  private createChainByChildren(context: Component, children: JSXInternal.JSXNode[], parent: Atom, atoms: Atom[]): Atom[] {
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
        this.createChainByChildren(context, item, parent, atoms)
        continue
      }
      if (item !== null && typeof item !== 'undefined') {
        atoms.push(this.createChainByJSXText(new JSXText(String(item)), parent))
      }
    }
    return atoms
  }

  private linkTemplate(template: JSXInternal.JSXNode, component: Component, parent: Atom) {
    const children = Array.isArray(template) ? template : [template]
    this.link(parent, this.createChainByChildren(component, children, parent, []))
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
        const className = classToString(props[key])
        if (className) {
          this.nativeRenderer.setClass(nativeNode, className)
        }
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
          this.bindEvent(vNode, key, nativeNode, listener)
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
          const type = key.replace(/^on/, '').toLowerCase()
          const oldOn = oldVNode.on!
          this.nativeRenderer.unListen(nativeNode, type, oldOn[type].delegate)
          Reflect.deleteProperty(oldOn, type)
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
        newVNode.on = oldVNode.on
        newVNode.on![listenType].listenFn = newValue
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
          this.bindEvent(newVNode, key, nativeNode, value)
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

  private bindEvent(vNode: JSXElement, key: string, nativeNode: NativeNode, listenFn: (...args: any[]) => any) {
    let on = vNode.on
    if (!on) {
      vNode.on = on = {}
    }
    const type = key.replace(/^on/, '').toLowerCase()
    const delegate = function (this: any, ...args: any[]) {
      return delegateObj.listenFn!.apply(this, args)
    }
    const delegateObj: ListenDelegate = {
      delegate,
      listenFn
    }
    on[type] = delegateObj
    this.nativeRenderer.listen(nativeNode, type, delegate)
  }
}
