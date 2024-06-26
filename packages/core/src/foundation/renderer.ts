import { NativeNode, NativeRenderer } from './injection-tokens'
import {
  classToString,
  getObjectChanges,
  ListenDelegate,
  refKey,
  styleToObject,
  Atom,
  TextAtom,
  ComponentAtom, ElementAtom
} from './_utils'
import { Component, DynamicRef } from './component'
import { JSXNode } from './jsx-element'

interface DiffContext {
  host: NativeNode,
  isParent: boolean,
  rootHost: NativeNode
}

interface DiffAtomIndexed {
  atom: Atom
  index: number
  prev?: DiffAtomIndexed | null
  next?: DiffAtomIndexed | null
}

const listenerReg = /^on(?=[A-Z])/

export function createRenderer(component: Component, nativeRenderer: NativeRenderer) {
  let isInit = true
  return function render(host: NativeNode) {
    if (isInit) {
      isInit = false
      const atom: Atom = {
        type: 'component',
        jsxNode: component,
        sibling: null,
        child: null,
        nativeNode: null,
        isSvg: false
      }
      componentRender(nativeRenderer, component, atom, {
        isParent: true,
        host,
        rootHost: host
      })
    } else {
      updateView(nativeRenderer, component)
    }
  }
}

function buildView(nativeRenderer: NativeRenderer, parentComponent: Component, atom: Atom, context: DiffContext) {
  const { jsxNode, type } = atom
  if (type === 'component') {
    const component = new Component(
      parentComponent,
      (jsxNode as JSXNode<JSXInternal.ComponentSetup>).type,
      (jsxNode as JSXNode<JSXInternal.ComponentSetup>).props,
      (jsxNode as JSXNode<JSXInternal.ComponentSetup>).key
    )
    atom.jsxNode = component
    componentRender(nativeRenderer, component, atom, context)
  } else {
    let nativeNode: NativeNode
    let applyRefs: null | (() => void) = null
    if (type === 'element') {
      const { nativeNode: n, applyRefs: a } = createElement(nativeRenderer, jsxNode, atom.isSvg)
      nativeNode = n
      applyRefs = a
    } else {
      nativeNode = createTextNode(nativeRenderer, jsxNode, atom.isSvg)
    }
    atom.nativeNode = nativeNode
    insertNode(nativeRenderer, atom, context)
    if (type === 'element') {
      const childContext: DiffContext = {
        isParent: true,
        host: nativeNode,
        rootHost: context.rootHost
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
  const { atom, host, isParent, rootHost } = component.$$view
  const diffAtom = atom.child
  const template = component.update(component.props, true)
  atom.child = createChildChain(template, atom.isSvg)

  const context: DiffContext = {
    host,
    isParent,
    rootHost
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
  const { jsxNode: newJsxNode, type } = newAtom
  const key = (newJsxNode as any).key
  while (diffAtomIndexed) {
    const { atom: diffAtom, index: diffIndex } = diffAtomIndexed
    if (type === diffAtom.type) {
      let commit: (offset: number) => void
      if (type === 'text') {
        commit = updateText(newAtom, diffAtom as TextAtom, nativeRenderer, context)
      } else {
        const { key: diffKey, type: diffType } = diffAtom.jsxNode as JSXNode
        if (diffKey !== key || newJsxNode.type !== diffType) {
          diffAtomIndexed = diffAtomIndexed.next as DiffAtomIndexed
          continue
        }
        if (type === 'component') {
          commit = updateComponent(newAtom, diffAtom as ComponentAtom, expectIndex, diffIndex, nativeRenderer, context)
        } else {
          commit = updateElement(newAtom, diffAtom as ElementAtom, expectIndex, diffIndex, nativeRenderer, context, parentComponent)
        }
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
  newAtom: TextAtom,
  oldAtom: TextAtom,
  nativeRenderer: NativeRenderer,
  context: DiffContext,
) {
  return function () {
    const nativeNode = oldAtom.nativeNode!
    if (newAtom.jsxNode !== oldAtom.jsxNode) {
      nativeRenderer.syncTextContent(nativeNode, newAtom.jsxNode, newAtom.isSvg)
    }
    newAtom.nativeNode = nativeNode
    context.host = nativeNode
    context.isParent = false
  }
}

function updateElement(
  newAtom: ElementAtom,
  oldAtom: ElementAtom,
  expectIndex: number,
  oldIndex: number,
  nativeRenderer: NativeRenderer,
  context: DiffContext,
  parentComponent: Component
) {
  return function (offset: number) {
    newAtom.nativeNode = oldAtom.nativeNode
    if (expectIndex - offset !== oldIndex) {
      insertNode(nativeRenderer, newAtom, context)
    }
    context.host = newAtom.nativeNode!
    context.isParent = false
    const applyRefs = updateNativeNodeProperties(
      nativeRenderer,
      newAtom.jsxNode,
      oldAtom.jsxNode,
      newAtom.nativeNode!,
      newAtom.isSvg)

    if (newAtom.child) {
      diff(nativeRenderer, parentComponent, newAtom.child, oldAtom.child, {
        host: newAtom.nativeNode!,
        isParent: true,
        rootHost: context.rootHost
      }, 0, 0)
    } else if (oldAtom.child) {
      let atom: Atom | null = oldAtom.child
      nativeRenderer.cleanChildren(oldAtom.nativeNode as NativeNode, oldAtom.isSvg)
      while (atom) {
        cleanView(nativeRenderer, atom, true)
        atom = atom.sibling
      }
    }
    applyRefs()
  }
}

function updateComponent(
  newAtom: ComponentAtom,
  reusedAtom: ComponentAtom,
  expectIndex: number,
  oldIndex: number,
  nativeRenderer: NativeRenderer,
  context: DiffContext
) {
  return function (offset: number) {
    const component = reusedAtom.jsxNode as Component
    const newProps = (newAtom.jsxNode as JSXNode<JSXInternal.ComponentSetup>).props
    const oldTemplate = component.template
    const newTemplate = component.update(newProps)
    const portalHost = component.instance.$portalHost
    context = portalHost ? { isParent: true, host: portalHost, rootHost: portalHost } : context
    component.$$view = {
      atom: newAtom,
      ...context
    }
    newAtom.jsxNode = component

    if (newTemplate === oldTemplate) {
      reuseComponentView(nativeRenderer, newAtom, reusedAtom, context, expectIndex - offset !== oldIndex)
      updateView(nativeRenderer, component)
      return
    }
    if (newTemplate) {
      newAtom.child = createChildChain(newTemplate, newAtom.isSvg)
    }
    if (newAtom.child) {
      diff(nativeRenderer, component, newAtom.child, reusedAtom.child, context, expectIndex, oldIndex + offset)
    } else if (reusedAtom.child) {
      let atom: Atom | null = reusedAtom.child
      while (atom) {
        cleanView(nativeRenderer, atom, false)
        atom = atom.sibling
      }
    }
    component.rendered()
  }
}

function reuseComponentView(nativeRenderer: NativeRenderer, newAtom: Atom, reusedAtom: Atom, context: DiffContext, moveView: boolean) {
  let child = reusedAtom.child
  newAtom.child = child
  const updateContext = (atom: Atom) => {
    if (atom.jsxNode instanceof Component) {
      let child = atom.child
      while (child) {
        updateContext(child)
        child = child.sibling
      }
    } else {
      if (moveView) {
        insertNode(nativeRenderer, atom, context)
      }
      context.isParent = false
      context.host = atom.nativeNode!
    }
  }
  while (child) {
    updateContext(child)
    child = child.sibling
  }
}

function cleanView(nativeRenderer: NativeRenderer, atom: Atom, needClean: boolean) {
  if (atom.nativeNode) {
    if (!needClean) {
      nativeRenderer.remove(atom.nativeNode, atom.isSvg)
      needClean = true
    }
    if (atom.type === 'element') {
      const ref = atom.jsxNode.props[refKey]
      applyRefs(ref, atom.nativeNode, false)
    }
  }

  let child = atom.child
  while (child) {
    if (child.jsxNode instanceof Component && child.jsxNode.instance.$portalHost) {
      needClean = false
    }
    cleanView(nativeRenderer, child, needClean)
    child = child.sibling
  }

  if (atom.jsxNode instanceof Component) {
    atom.jsxNode.destroy()
  }
}

function componentRender(nativeRenderer: NativeRenderer, component: Component, from: Atom, context: DiffContext) {
  const { template, portalHost } = component.render()
  from.child = createChildChain(template, from.isSvg)
  context = portalHost ? { isParent: true, host: portalHost, rootHost: portalHost } : context
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

function createChainByJSXComponent(jsxNode: JSXNode<JSXInternal.ComponentSetup>, prevAtom: Atom, isSvg: boolean) {
  const atom: ComponentAtom = {
    type: 'component',
    jsxNode,
    sibling: null,
    child: null,
    nativeNode: null,
    isSvg
  }
  prevAtom.sibling = atom
  return atom
}

function createChainByJSXText(jsxNode: string, prevAtom: Atom, isSvg: boolean) {
  const atom: TextAtom = {
    type: 'text',
    jsxNode,
    sibling: null,
    child: null,
    nativeNode: null,
    isSvg
  }
  prevAtom.sibling = atom
  return atom
}

function createChainByJSXElement(element: JSXNode<string>, prevAtom: Atom, isSvg: boolean) {
  isSvg = isSvg || element.type === 'svg'
  const atom: ElementAtom = {
    type: 'element',
    jsxNode: element,
    sibling: null,
    child: null,
    nativeNode: null,
    isSvg
  }
  prevAtom.sibling = atom
  atom.child = createChildChain(element.props.children, isSvg)
  return atom
}

function createChainByNode(jsxNode: JSXInternal.ViewNode, prevAtom: Atom, isSvg: boolean) {
  const type = typeof jsxNode
  if (jsxNode !== null && type !== 'undefined' && type !== 'boolean') {
    if (typeof jsxNode === 'string') {
      return createChainByJSXText(jsxNode, prevAtom, isSvg)
    }
    if (Array.isArray(jsxNode)) {
      return createChainByChildren(jsxNode, prevAtom, isSvg)
    }
    if (type === 'object') {
      const nodeType = typeof jsxNode.type
      if (nodeType === 'string') {
        return createChainByJSXElement(jsxNode, prevAtom, isSvg)
      } else if (nodeType === 'function') {
        return createChainByJSXComponent(jsxNode, prevAtom, isSvg)
      }
    }
    return createChainByJSXText(String(jsxNode), prevAtom, isSvg)
  }
  return prevAtom
}

function createChainByChildren(children: JSXInternal.ViewNode[], prevAtom: Atom, isSvg: boolean) {
  for (const item of children) {
    prevAtom = createChainByNode(item, prevAtom, isSvg)
  }
  return prevAtom
}

function createChildChain(template: JSXInternal.ViewNode, isSvg: boolean) {
  const beforeAtom = { sibling: null } as Atom
  createChainByNode(template, beforeAtom, isSvg)
  return beforeAtom.sibling
}

function insertNode(nativeRenderer: NativeRenderer, atom: Atom, context: DiffContext) {
  if (context.isParent) {
    if (context.host === context.rootHost) {
      nativeRenderer.appendChild(context.host, atom.nativeNode!, atom.isSvg)
    } else {
      nativeRenderer.prependChild(context.host, atom.nativeNode!, atom.isSvg)
    }
  } else {
    nativeRenderer.insertAfter(atom.nativeNode!, context.host, atom.isSvg)
  }
}

function createElement(nativeRenderer: NativeRenderer, vNode: JSXNode<string>, isSvg: boolean) {
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
    if (listenerReg.test(key)) {
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

function createTextNode(nativeRenderer: NativeRenderer, text: string, isSvg: boolean) {
  return nativeRenderer.createTextNode(text, isSvg)
}

function updateNativeNodeProperties(
  nativeRenderer: NativeRenderer,
  newVNode: JSXNode<string>,
  oldVNode: JSXNode<string>,
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
    if (listenerReg.test(key)) {
      if (typeof value === 'function') {
        const type = key.replace(listenerReg, '').toLowerCase()
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
    if (listenerReg.test(key)) {
      const listenType = key.replace(listenerReg, '').toLowerCase()
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
    if (listenerReg.test(key)) {
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
  if (refs) {
    const refList: any[] = Array.isArray(refs) ? refs : [refs]
    for (const item of refList) {
      if (item instanceof DynamicRef) {
        binding ? item.bind(nativeNode) : item.unBind(nativeNode)
      }
    }
  }
}

function bindEvent(nativeRenderer: NativeRenderer,
                   vNode: JSXNode<string>,
                   key: string,
                   nativeNode: NativeNode,
                   listenFn: (...args: any[]) => any, isSvg: boolean) {
  let on = vNode.on
  if (!on) {
    vNode.on = on = {}
  }
  const type = key.replace(listenerReg, '').toLowerCase()
  const delegateObj: ListenDelegate = {
    delegate(this: any, ...args: any[]) {
      return delegateObj.listenFn!.apply(this, args)
    },
    listenFn
  }
  on[type] = delegateObj
  nativeRenderer.listen(nativeNode, type, delegateObj.delegate, isSvg)
}
