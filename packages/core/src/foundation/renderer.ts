import { NativeNode, NativeRenderer } from './injection-tokens'
import { classToString, getObjectChanges, ListenDelegate, refKey, styleToObject, Atom } from './_utils'
import { JSXElement, JSXText, JSXComponent } from './jsx-element'
import { Component, Ref } from './component'
import { JSXInternal } from './types'

interface DiffContext {
  host: NativeNode,
  isParent: boolean
}

interface DiffAtomIndexed {
  atom: Atom
  index: number
  prev?: DiffAtomIndexed | null
  next?: DiffAtomIndexed | null
}

export function createRenderer(component: Component, nativeRenderer: NativeRenderer) {
  let isInit = true
  return function render(host: NativeNode) {
    if (isInit) {
      isInit = false
      const atom: Atom = {
        jsxNode: component,
        parent: null,
        sibling: null,
        child: null,
        nativeNode: null,
        isSvg: false
      }
      componentRender(nativeRenderer, component, atom, {
        isParent: true,
        host
      })
    } else {
      updateView(nativeRenderer, component)
    }
  }
}

function buildView(nativeRenderer: NativeRenderer, parentComponent: Component, atom: Atom, context: DiffContext) {
  if (atom.jsxNode instanceof JSXComponent) {
    const component = atom.jsxNode.createInstance(parentComponent)
    atom.jsxNode = component
    componentRender(nativeRenderer, component, atom, context)
  } else {
    let nativeNode: NativeNode
    let applyRefs: null | (() => void) = null
    if (atom.jsxNode instanceof JSXElement) {
      const { nativeNode: n, applyRefs: a } = createElement(nativeRenderer, atom.jsxNode, atom.isSvg)
      nativeNode = n
      applyRefs = a
    } else {
      nativeNode = createTextNode(nativeRenderer, atom.jsxNode as JSXText, atom.isSvg)
    }
    atom.nativeNode = nativeNode
    if (context.isParent) {
      nativeRenderer.prependChild(context.host, nativeNode, atom.isSvg)
    } else {
      nativeRenderer.insertAfter(nativeNode, context.host, atom.isSvg)
    }
    if (atom.jsxNode instanceof JSXElement) {
      const childContext = {
        isParent: true,
        host: nativeNode
      }
      let child = atom.child
      while (child) {
        buildView(nativeRenderer, parentComponent, child, childContext,)
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

function updateView(nativeRenderer: NativeRenderer, component: Component) {
  if (component.dirty) {
    applyChanges(nativeRenderer, component)
    component.rendered()
  } else if (component.changed) {
    component.changedSubComponents.forEach(child => {
      updateView(nativeRenderer, child)
    })
    component.rendered()
  }
}

function applyChanges(nativeRenderer: NativeRenderer, component: Component) {
  const { atom, host, isParent } = component.$$view
  const diffAtom = atom.child
  const template = component.update(component.props, true)
  if (template) {
    linkTemplate(template, component, atom)
  } else {
    atom.child = null
  }

  const context: DiffContext = {
    host,
    isParent
  }
  diff(nativeRenderer, component, atom.child, diffAtom, context, 0, 0)

  const next = atom.sibling
  if (next && next.jsxNode instanceof Component) {
    next.jsxNode.$$view!.host = context.host
    next.jsxNode.$$view!.isParent = context.isParent
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
  let prevDiffAtom: DiffAtomIndexed | null = null
  let firstDiffAtomIndexed: DiffAtomIndexed | null = null
  if (oldAtom) {
    prevDiffAtom = {
      index,
      atom: oldAtom,
      prev: null
    }
    index++
    firstDiffAtomIndexed = prevDiffAtom
    oldAtom = oldAtom.sibling
    while (oldAtom) {
      const diffAtom: DiffAtomIndexed = {
        index,
        atom: oldAtom,
        prev: prevDiffAtom
      }
      prevDiffAtom.next = diffAtom
      prevDiffAtom = diffAtom
      oldAtom = oldAtom.sibling
      index++
    }
  }

  const commits: Array<(offset: number) => void> = []

  function changeOffset() {
    offset++
  }

  while (newAtom) {
    firstDiffAtomIndexed = createChanges(
      newAtom,
      expectIndex,
      firstDiffAtomIndexed,
      nativeRenderer,
      commits,
      context,
      parentComponent,
      changeOffset
    )
    newAtom = newAtom.sibling
    expectIndex++
  }
  let dirtyDiffAtom = firstDiffAtomIndexed
  while (dirtyDiffAtom) {
    cleanView(nativeRenderer, dirtyDiffAtom.atom, false)
    dirtyDiffAtom = dirtyDiffAtom.next as DiffAtomIndexed
  }

  let offset = 0
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    while (firstDiffAtomIndexed) {
      if (firstDiffAtomIndexed.index <= i) {
        offset--
        firstDiffAtomIndexed = firstDiffAtomIndexed.next as DiffAtomIndexed
        continue
      }
      break
    }
    commit(offset)
  }
}

function createChanges(
  newAtom: Atom,
  expectIndex: number,
  diffAtomIndexed: DiffAtomIndexed | null,
  nativeRenderer: NativeRenderer,
  commits: Array<(offset: number) => void>,
  context: DiffContext,
  parentComponent: Component,
  effect: () => void
): DiffAtomIndexed | null {
  const startDiffAtom = diffAtomIndexed
  const key = (newAtom.jsxNode as any).key
  while (diffAtomIndexed) {
    const { atom: diffAtom, index: diffIndex } = diffAtomIndexed
    const diffKey = (diffAtom.jsxNode as any).key

    if (key !== undefined) {
      if (diffKey !== key) {
        diffAtomIndexed = diffAtomIndexed.next as DiffAtomIndexed
        continue
      }
    } else if (diffKey !== undefined) {
      diffAtomIndexed = diffAtomIndexed.next as DiffAtomIndexed
      continue
    }
    if (newAtom.jsxNode.$$typeOf === diffAtom.jsxNode.$$typeOf) {
      let commit: (offset: number) => void
      if (newAtom.jsxNode instanceof JSXElement) {
        commit = updateElement(newAtom, diffAtom, expectIndex, diffIndex, nativeRenderer, context, parentComponent)
      } else if (newAtom.jsxNode instanceof JSXText) {
        commit = updateText(newAtom, diffAtom, nativeRenderer, context)
      } else {
        commit = updateComponent(newAtom, diffAtom, expectIndex, diffIndex, nativeRenderer, context)
      }
      commits.push(commit)
      const next = diffAtomIndexed.next
      const prev = diffAtomIndexed.prev
      if (!prev) {
        diffAtomIndexed = next as DiffAtomIndexed
        if (diffAtomIndexed) {
          diffAtomIndexed.prev = null
        }
        return diffAtomIndexed
      }
      prev.next = next
      if (next) {
        next.prev = prev
      }
      return startDiffAtom
    }
    diffAtomIndexed = diffAtomIndexed.next as DiffAtomIndexed
  }
  commits.push(
    createNewView(newAtom, nativeRenderer, context, parentComponent, effect)
  )
  return startDiffAtom
}

function createNewView(
  start: Atom,
  nativeRenderer: NativeRenderer,
  context: DiffContext,
  parentComponent: Component,
  effect: () => void
) {
  return function () {
    buildView(nativeRenderer, parentComponent, start, context)
    effect()
  }
}

function updateText(
  newAtom: Atom,
  oldAtom: Atom,
  nativeRenderer: NativeRenderer,
  context: DiffContext,
) {
  return function () {
    const nativeNode = oldAtom.nativeNode!
    if ((newAtom.jsxNode as JSXText).text !== (oldAtom.jsxNode as JSXText).text) {
      nativeRenderer.syncTextContent(nativeNode, (newAtom.jsxNode as JSXText).text, newAtom.isSvg)
    }
    newAtom.nativeNode = nativeNode
    context.host = nativeNode
    context.isParent = false
  }
}

function updateElement(
  newAtom: Atom,
  oldAtom: Atom,
  expectIndex: number,
  oldIndex: number,
  nativeRenderer: NativeRenderer,
  context: DiffContext,
  parentComponent: Component
) {
  return function (offset: number) {
    newAtom.nativeNode = oldAtom.nativeNode
    const host = context.host
    if (expectIndex - offset !== oldIndex) {
      if (context.isParent) {
        nativeRenderer.prependChild(host, newAtom.nativeNode!, newAtom.isSvg)
      } else {
        nativeRenderer.insertAfter(newAtom.nativeNode!, host, newAtom.isSvg)
      }
    }
    context.host = newAtom.nativeNode!
    context.isParent = false
    const applyRefs = updateNativeNodeProperties(
      nativeRenderer,
      newAtom.jsxNode as JSXElement,
      oldAtom.jsxNode as JSXElement,
      newAtom.nativeNode!,
      newAtom.isSvg)

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
  }
}

function updateComponent(
  newAtom: Atom,
  reusedAtom: Atom,
  expectIndex: number,
  oldIndex: number,
  nativeRenderer: NativeRenderer,
  context: DiffContext
) {
  return function (offset: number) {
    const instance = reusedAtom.jsxNode as Component
    const newProps = (newAtom.jsxNode as JSXComponent).props
    const oldTemplate = instance.template
    const newTemplate = instance.update(newProps)
    instance.$$view = {
      atom: newAtom,
      ...context
    }
    newAtom.jsxNode = instance

    if (newTemplate === oldTemplate) {
      reuseComponentView(nativeRenderer, newAtom, reusedAtom, context, expectIndex - offset !== oldIndex)
      updateView(nativeRenderer, instance)
      return
    }
    if (newTemplate) {
      linkTemplate(newTemplate, newAtom.jsxNode, newAtom)
    }
    if (newAtom.child) {
      diff(nativeRenderer, instance, newAtom.child, reusedAtom.child, context, expectIndex, oldIndex)
    } else if (reusedAtom.child) {
      let atom: Atom | null = reusedAtom.child
      while (atom) {
        cleanView(nativeRenderer, atom, false)
        atom = atom.sibling
      }
    }
    instance.rendered()
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
    if (atom.jsxNode instanceof Component) {
      let child = atom.child
      while (child) {
        updateContext(child)
        child = child.sibling
      }
    } else {
      if (moveView) {
        if (context.isParent) {
          nativeRenderer.prependChild(context.host, atom.nativeNode!, atom.isSvg)
        } else {
          nativeRenderer.insertAfter(atom.nativeNode!, context.host, atom.isSvg)
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

function cleanView(nativeRenderer: NativeRenderer, atom: Atom, isClean: boolean) {
  if (atom.nativeNode) {
    if (!isClean) {
      nativeRenderer.remove(atom.nativeNode, atom.isSvg)
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

  if (atom.jsxNode instanceof Component) {
    atom.jsxNode.destroy()
  }
}


function componentRender(nativeRenderer: NativeRenderer, component: Component, from: Atom, context: DiffContext) {
  const template = component.render()
  if (template) {
    linkTemplate(template, component, from)
  }
  component.$$view = {
    atom: from,
    ...context
  }
  let child = from.child
  while (child) {
    buildView(nativeRenderer, component, child, context)
    child = child.sibling
  }
  component.rendered()
}

function createChainByJSXComponentOrJSXText(jsxNode: JSXComponent | JSXText, parent: Atom, isSvg: boolean): Atom {
  return {
    jsxNode,
    parent,
    sibling: null,
    child: null,
    nativeNode: null,
    isSvg
  }
}

function createChainByJSXElement(component: Component, element: JSXElement, parent: Atom, isSvg: boolean) {
  isSvg = isSvg || element.type === 'svg'
  const atom: Atom = {
    jsxNode: element,
    parent,
    sibling: null,
    child: null,
    nativeNode: null,
    isSvg
  }
  if (Reflect.has(element.props, 'children')) {
    const jsxChildren = element.props.children
    const children = createChainByChildren(component, Array.isArray(jsxChildren) ? jsxChildren : [jsxChildren], atom, [], isSvg)
    link(atom, children)
  }
  return atom
}

function createChainByChildren(component: Component, children: JSXInternal.JSXNode[], parent: Atom, atoms: Atom[], isSvg: boolean): Atom[] {
  for (const item of children) {
    if (item !== null && typeof item !== 'undefined' && typeof item !== 'boolean') {
      if (item instanceof JSXElement) {
        atoms.push(createChainByJSXElement(component, item, parent, isSvg))
        continue
      }
      if (typeof item === 'string' && item.length) {
        atoms.push(createChainByJSXComponentOrJSXText(new JSXText(item), parent, isSvg))
        continue
      }
      if (Array.isArray(item)) {
        createChainByChildren(component, item, parent, atoms, isSvg)
        continue
      }
      if (item instanceof JSXComponent) {
        const childAtom = createChainByJSXComponentOrJSXText(item, parent, isSvg)
        atoms.push(childAtom)
        continue
      }
      atoms.push(createChainByJSXComponentOrJSXText(new JSXText(String(item)), parent, isSvg))
    }
  }
  return atoms
}

function linkTemplate(template: JSXInternal.JSXNode, component: Component, parent: Atom) {
  const children = Array.isArray(template) ? template : [template]
  const newChildren = createChainByChildren(component, children, parent, [], parent.isSvg)
  link(parent, newChildren)
}

function link(parent: Atom, children: Atom[]) {
  for (let i = 1; i < children.length; i++) {
    const prev = children[i - 1]
    prev.sibling = children[i]
  }
  parent.child = children[0] || null
}

function createElement(nativeRenderer: NativeRenderer, vNode: JSXElement, isSvg: boolean) {
  const nativeNode = nativeRenderer.createElement(vNode.type, isSvg)
  const props = vNode.props
  let bindingRefs: any

  for (const key in props) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      const className = classToString(props[key])
      if (className) {
        nativeRenderer.setClass(nativeNode, className, isSvg)
      }
      continue
    }
    if (key === 'style') {
      const style = styleToObject(props.style)
      for (const key in style) {
        nativeRenderer.setStyle(nativeNode, key, style[key], isSvg)
      }
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      const listener = props[key]
      if (typeof listener === 'function') {
        bindEvent(nativeRenderer, vNode, key, nativeNode, listener, isSvg)
      }
      continue
    }
    if (key === refKey) {
      bindingRefs = props[key]
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, props[key], isSvg)
  }
  return {
    nativeNode,
    applyRefs: () => {
      applyRefs(bindingRefs, nativeNode, true)
    }
  }
}

function createTextNode(nativeRenderer: NativeRenderer, child: JSXText, isSvg: boolean) {
  return nativeRenderer.createTextNode(child.text, isSvg)
}

function updateNativeNodeProperties(
  nativeRenderer: NativeRenderer,
  newVNode: JSXElement,
  oldVNode: JSXElement,
  nativeNode: NativeNode,
  isSvg: boolean) {
  const changes = getObjectChanges(newVNode.props, oldVNode.props)
  let unBindRefs: any
  let bindRefs: any
  newVNode.on = oldVNode.on

  for (const [key, value] of changes.remove) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      nativeRenderer.setClass(nativeNode, '', isSvg)
      continue
    }
    if (key === 'style') {
      for (const styleName in styleToObject(value)) {
        nativeRenderer.removeStyle(nativeNode, styleName, isSvg)
      }
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      if (typeof value === 'function') {
        const type = key.replace(/^on/, '').toLowerCase()
        const oldOn = oldVNode.on!
        nativeRenderer.unListen(nativeNode, type, oldOn[type].delegate, isSvg)
        Reflect.deleteProperty(oldOn, type)
      }
      continue
    }
    if (key === refKey) {
      unBindRefs = value
      continue
    }
    nativeRenderer.removeProperty(nativeNode, key, isSvg)
  }

  for (const [key, newValue, oldValue] of changes.replace) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      const oldClassName = classToString(oldValue)
      const newClassName = classToString(newValue)
      if (oldClassName !== newClassName) {
        nativeRenderer.setClass(nativeNode, newClassName, isSvg)
      }
      continue
    }
    if (key === 'style') {
      const styleChanges = getObjectChanges(styleToObject(newValue) || {}, styleToObject(oldValue) || {})
      for (const [styleName] of styleChanges.remove) {
        nativeRenderer.removeStyle(nativeNode, styleName, isSvg)
      }
      for (const [styleName, styleValue] of [...styleChanges.add, ...styleChanges.replace]) {
        nativeRenderer.setStyle(nativeNode, styleName, styleValue, isSvg)
      }
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      const listenType = key.replace(/^on/, '').toLowerCase()
      newVNode.on![listenType].listenFn = newValue
      continue
    }
    if (key === refKey) {
      unBindRefs = oldValue
      bindRefs = newValue
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, newValue, isSvg)
  }

  for (const [key, value] of changes.add) {
    if (key === 'children') {
      continue
    }
    if (key === 'class') {
      nativeRenderer.setClass(nativeNode, classToString(value), isSvg)
      continue
    }
    if (key === 'style') {
      const styleObj = styleToObject(value)
      for (const styleName in styleObj) {
        nativeRenderer.setStyle(nativeNode, styleName, styleObj[styleName], isSvg)
      }
      continue
    }
    if (/^on[A-Z]/.test(key)) {
      if (typeof value === 'function') {
        bindEvent(nativeRenderer, newVNode, key, nativeNode, value, isSvg)
      }
      continue
    }
    if (key === refKey) {
      bindRefs = value
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, value, isSvg)
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
                   listenFn: (...args: any[]) => any, isSvg: boolean) {
  let on = vNode.on
  if (!on) {
    vNode.on = on = {}
  }
  const type = key.replace(/^on/, '').toLowerCase()
  const delegateObj: ListenDelegate = {
    delegate(this: any, ...args: any[]) {
      return delegateObj.listenFn!.apply(this, args)
    },
    listenFn
  }
  on[type] = delegateObj
  nativeRenderer.listen(nativeNode, type, delegateObj.delegate, isSvg)
}
