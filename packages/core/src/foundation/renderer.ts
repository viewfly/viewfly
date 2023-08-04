import { NativeNode, NativeRenderer } from './injection-tokens'
import { classToString, getObjectChanges, ListenDelegate, refKey, styleToObject, Atom } from './_utils'
import { JSXElement, JSXText, JSXComponent } from './jsx-element'
import { Component, Ref } from './component'
import { JSXInternal } from './types'

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

export function createRenderer(jsxComponent: JSXComponent, nativeRenderer: NativeRenderer, parentComponent: Component) {
  let isInit = true
  return function render(host: NativeNode) {
    if (isInit) {
      isInit = false
      const atom: Atom = {
        jsxNode: jsxComponent,
        parent: null,
        sibling: null,
        child: null,
        nativeNode: null
      }
      buildView(nativeRenderer, parentComponent, atom, {
        isParent: true,
        host
      })
    } else {
      updateView(nativeRenderer, jsxComponent)
    }
  }
}

function buildView(nativeRenderer: NativeRenderer, parentComponent: Component, atom: Atom, context: DiffContext) {
  if (atom.jsxNode instanceof JSXComponent) {
    const component = componentRender(atom.jsxNode, parentComponent, atom, context)
    let child = atom.child
    while (child) {
      buildView(nativeRenderer, component, child, context)
      child = child.sibling
    }
    atom.jsxNode.reset()
  } else {
    let nativeNode: NativeNode
    let applyRefs: null | (() => void) = null
    if (atom.jsxNode instanceof JSXElement) {
      const { nativeNode: n, applyRefs: a } = createElement(nativeRenderer, atom.jsxNode)
      nativeNode = n
      applyRefs = a
    } else {
      nativeNode = createTextNode(nativeRenderer, atom.jsxNode)
    }
    atom.nativeNode = nativeNode
    if (context.isParent) {
      nativeRenderer.prependChild(context.host, nativeNode)
    } else {
      nativeRenderer.insertAfter(nativeNode, context.host)
    }
    if (atom.jsxNode instanceof JSXElement) {
      const childContext = {
        isParent: true,
        host: nativeNode
      }
      let child = atom.child
      while (child) {
        buildView(nativeRenderer, parentComponent, child, childContext)
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

function updateView(nativeRenderer: NativeRenderer, jsxComponent: JSXComponent) {
  if (jsxComponent.dirty) {
    applyChanges(nativeRenderer, jsxComponent)
    jsxComponent.reset()
  } else if (jsxComponent.changed) {
    jsxComponent.changedSubComponents.forEach(child => {
      updateView(nativeRenderer, child)
    })
    jsxComponent.reset()
  }
}

function applyChanges(nativeRenderer: NativeRenderer, jsxComponent: JSXComponent) {
  const { atom, host, isParent } = jsxComponent.$$view
  const diffAtom = atom.child
  const template = jsxComponent.instance.update(jsxComponent.instance.props, true)
  if (template) {
    linkTemplate(template, jsxComponent, atom)
  } else {
    atom.child = null
  }

  const context: DiffContext = {
    host,
    isParent
  }
  diff(nativeRenderer, jsxComponent.instance, atom.child, diffAtom, context, 0, 0)

  const next = atom.sibling
  if (next && next.jsxNode instanceof JSXComponent) {
    next.jsxNode.$$view.host = context.host
    next.jsxNode.$$view.isParent = context.isParent
  }
}

function diff(
  nativeRenderer: NativeRenderer,
  parentComponent: Component,
  newAtom: Atom | null,
  oldAtom: Atom | null,
  context: DiffContext,
  expectIndex: number,
  index: number
) {
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
        const oldJSXComponent = reusedAtom.jsxNode as JSXComponent
        const instance = oldJSXComponent.instance
        const newProps = (newAtom.jsxNode as JSXComponent).props
        const oldTemplate = instance.template
        const newTemplate = instance.update(newProps)
        oldJSXComponent.$$view = {
          atom: newAtom,
          ...context
        }
        newAtom.jsxNode = oldJSXComponent

        if (newTemplate === oldTemplate) {
          reuseComponentView(nativeRenderer, newAtom, reusedAtom, context, expectIndex !== diffIndex - offset)
          return
        }
        if (newTemplate) {
          linkTemplate(newTemplate, newAtom.jsxNode, newAtom)
        }
        if (newAtom.child) {
          diff(nativeRenderer, instance, newAtom.child, reusedAtom.child, context, expectIndex, diffIndex)
        } else if (reusedAtom.child) {
          let atom: Atom | null = reusedAtom.child
          while (atom) {
            cleanView(nativeRenderer, atom, false)
            atom = atom.sibling
          }
        }
        oldJSXComponent.reset()
      })
    },
    updateElement: (newAtom: Atom, oldAtom: Atom, expectIndex: number, oldIndex: number) => {
      commits.push((offset: number) => {
        newAtom.nativeNode = oldAtom.nativeNode
        const host = context.host
        if (expectIndex !== oldIndex - offset) {
          if (context.isParent) {
            nativeRenderer.prependChild(host, newAtom.nativeNode!)
          } else {
            nativeRenderer.insertAfter(newAtom.nativeNode!, host)
          }
        }
        context.host = newAtom.nativeNode!
        context.isParent = false
        const applyRefs = updateNativeNodeProperties(
          nativeRenderer,
          newAtom.jsxNode as JSXElement,
          oldAtom.jsxNode as JSXElement,
          newAtom.nativeNode!)

        if (newAtom.child) {
          diff(nativeRenderer, parentComponent, newAtom.child, oldAtom.child, {
            host: newAtom.nativeNode!,
            isParent: true
          }, 0, 0)
        } else if (oldAtom.child) {
          let atom: Atom | null = oldAtom.child
          while (atom) {
            cleanView(nativeRenderer, atom, false)
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
          nativeRenderer.syncTextContent(nativeNode, (newAtom.jsxNode as JSXText).text)
        }
        newAtom.nativeNode = nativeNode
        context.host = nativeNode
        context.isParent = false
      })
    },
    create: (start: Atom) => {
      commits.push(() => {
        buildView(nativeRenderer, parentComponent, start, context)
      })
    }
  }

  while (newAtom) {
    createChanges(newAtom, expectIndex, oldChildren, changeCommits)
    newAtom = newAtom.sibling
    expectIndex++
  }
  for (const item of oldChildren) {
    cleanView(nativeRenderer, item.atom, false)
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

function reuseComponentView(nativeRenderer: NativeRenderer, newAtom: Atom, reusedAtom: Atom, context: DiffContext, moveView: boolean) {
  let child = reusedAtom.child
  newAtom.child = child
  const children: Atom[] = []
  while (child) {
    children.push(child)
    child.parent = newAtom
    child = child.sibling
  }

  const updateContext = (atom: Atom) => {
    if (atom.jsxNode instanceof JSXComponent) {
      let child = atom.child
      while (child) {
        updateContext(child)
        child = child.sibling
      }
    } else {
      if (moveView) {
        if (context.isParent) {
          nativeRenderer.prependChild(context.host, atom.nativeNode!)
        } else {
          nativeRenderer.insertAfter(atom.nativeNode!, context.host)
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

function createChanges(newAtom: Atom, expectIndex: number, oldChildren: DiffAtomIndexed[], changeCommits: ChangeCommits) {
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

function cleanView(nativeRenderer: NativeRenderer, atom: Atom, isClean: boolean) {
  if (atom.nativeNode) {
    if (!isClean) {
      nativeRenderer.remove(atom.nativeNode)
      isClean = true
    }
    if (atom.jsxNode instanceof JSXElement) {
      const ref = atom.jsxNode.props[refKey]
      applyRefs(ref, atom.nativeNode, false)
    }
  }

  let child = atom.child
  while (child) {
    cleanView(nativeRenderer, child, isClean)
    child = child.sibling
  }

  if (atom.jsxNode instanceof JSXComponent) {
    atom.jsxNode.instance.destroy()
  }
}


function componentRender(jsxComponent: JSXComponent, parentComponent: Component, from: Atom, context: DiffContext) {
  const component = jsxComponent.createInstance(parentComponent)
  const template = component.render()
  if (template) {
    linkTemplate(template, jsxComponent, from)
  }
  jsxComponent.$$view = {
    atom: from,
    ...context
  }
  return component
}

function createChainByComponentFactory(jsxComponent: JSXComponent, parent: Atom): Atom {
  return {
    jsxNode: jsxComponent,
    parent,
    sibling: null,
    child: null,
    nativeNode: null
  }
}

function createChainByJSXElement(jsxComponent: JSXComponent, element: JSXElement, parent: Atom) {
  const atom: Atom = {
    jsxNode: element,
    parent,
    sibling: null,
    child: null,
    nativeNode: null
  }
  if (Reflect.has(element.props, 'children')) {
    const jsxChildren = element.props.children
    const children = createChainByChildren(jsxComponent, Array.isArray(jsxChildren) ? jsxChildren : [jsxChildren], atom, [])
    link(atom, children)
  }
  return atom
}

function createChainByJSXText(node: JSXText, parent: Atom): Atom {
  return {
    jsxNode: node,
    parent,
    sibling: null,
    child: null,
    nativeNode: null
  }
}

function createChainByChildren(jsxComponent: JSXComponent, children: JSXInternal.JSXNode[], parent: Atom, atoms: Atom[]): Atom[] {
  for (const item of children) {
    if (item instanceof JSXElement) {
      atoms.push(createChainByJSXElement(jsxComponent, item, parent))
      continue
    }
    if (item instanceof JSXComponent) {
      const childAtom = createChainByComponentFactory(item, parent)
      atoms.push(childAtom)
      continue
    }
    if (typeof item === 'string' && item.length) {
      atoms.push(createChainByJSXText(new JSXText(item), parent))
      continue
    }
    if (Array.isArray(item)) {
      createChainByChildren(jsxComponent, item, parent, atoms)
      continue
    }
    if (item !== null && typeof item !== 'undefined') {
      atoms.push(createChainByJSXText(new JSXText(String(item)), parent))
    }
  }
  return atoms
}

function linkTemplate(template: JSXInternal.JSXNode, jsxComponent: JSXComponent, parent: Atom) {
  const children = Array.isArray(template) ? template : [template]
  const newChildren = createChainByChildren(jsxComponent, children, parent, [])
  link(parent, newChildren)
}

function link(parent: Atom, children: Atom[]) {
  for (let i = 1; i < children.length; i++) {
    const prev = children[i - 1]
    prev.sibling = children[i]
  }
  parent.child = children[0] || null
}

function createElement(nativeRenderer: NativeRenderer, vNode: JSXElement) {
  const nativeNode = nativeRenderer.createElement(vNode.type)
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
        nativeRenderer.setClass(nativeNode, className)
      }
      continue
    }
    if (key === 'style') {
      const style = styleToObject(props.style)
      Object.keys(style).forEach(key => {
        nativeRenderer.setStyle(nativeNode, key, style[key])
      })
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      const listener = props[key]
      if (typeof listener === 'function') {
        bindEvent(nativeRenderer, vNode, key, nativeNode, listener)
      }
      continue
    }
    if (key === refKey) {
      bindingRefs = props[key]
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, props[key])
  }
  return {
    nativeNode,
    applyRefs: () => {
      applyRefs(bindingRefs, nativeNode, true)
    }
  }
}

function createTextNode(nativeRenderer: NativeRenderer, child: JSXText) {
  return nativeRenderer.createTextNode(child.text)
}

function updateNativeNodeProperties(
  nativeRenderer: NativeRenderer,
  newVNode: JSXElement,
  oldVNode: JSXElement,
  nativeNode: NativeNode) {
  const changes = getObjectChanges(newVNode.props, oldVNode.props)
  let unBindRefs: any
  let bindRefs: any

  for (const [key, value] of changes.remove) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      nativeRenderer.setClass(nativeNode, '')
      continue
    }
    if (key === 'style') {
      Object.keys(styleToObject(value)).forEach(styleName => {
        nativeRenderer.removeStyle(nativeNode, styleName)
      })
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      if (typeof value === 'function') {
        const type = key.replace(/^on/, '').toLowerCase()
        const oldOn = oldVNode.on!
        nativeRenderer.unListen(nativeNode, type, oldOn[type].delegate)
        Reflect.deleteProperty(oldOn, type)
      }
      continue
    }
    if (key === refKey) {
      unBindRefs = value
      continue
    }
    nativeRenderer.removeProperty(nativeNode, key)
  }

  for (const [key, newValue, oldValue] of changes.replace) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      const oldClassName = classToString(oldValue)
      const newClassName = classToString(newValue)
      if (oldClassName !== newClassName) {
        nativeRenderer.setClass(nativeNode, newClassName)
      }
      continue
    }
    if (key === 'style') {
      const styleChanges = getObjectChanges(styleToObject(newValue) || {}, styleToObject(oldValue) || {})
      for (const [styleName] of styleChanges.remove) {
        nativeRenderer.removeStyle(nativeNode, styleName)
      }
      for (const [styleName, styleValue] of [...styleChanges.add, ...styleChanges.replace]) {
        nativeRenderer.setStyle(nativeNode, styleName, styleValue)
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
    nativeRenderer.setProperty(nativeNode, key, newValue)
  }

  for (const [key, value] of changes.add) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      nativeRenderer.setClass(nativeNode, classToString(value))
      continue
    }
    if (key === 'style') {
      const styleObj = styleToObject(value)
      Object.keys(styleObj).forEach(styleName => {
        nativeRenderer.setStyle(nativeNode, styleName, styleObj[styleName])
      })
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      if (typeof value === 'function') {
        bindEvent(nativeRenderer, newVNode, key, nativeNode, value)
      }
      continue
    }
    if (key === refKey) {
      bindRefs = value
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, value)
  }

  return () => {
    applyRefs(unBindRefs, nativeNode, false)
    applyRefs(bindRefs!, nativeNode, true)
  }
}

function applyRefs(refs: any, nativeNode: NativeNode, binding: boolean) {
  const refList: any[] = Array.isArray(refs) ? refs : [refs]
  for (const item of refList) {
    if (item instanceof Ref) {
      binding ? item.bind(nativeNode) : item.unBind(nativeNode)
    }
  }
}

function bindEvent(nativeRenderer: NativeRenderer,
                   vNode: JSXElement,
                   key: string,
                   nativeNode: NativeNode,
                   listenFn: (...args: any[]) => any) {
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
  nativeRenderer.listen(nativeNode, type, delegate)
}
