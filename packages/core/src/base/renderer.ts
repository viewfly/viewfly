import { NativeNode, NativeRenderer } from './injection-tokens'
import {
  Atom,
  classToString,
  ComponentAtom,
  ComponentAtomType,
  ElementAtom,
  ElementAtomType,
  ElementNamespace,
  comparePropsWithCallbacks,
  hasChange,
  refKey,
  styleToObject,
  TextAtom,
  TextAtomType
} from './_utils'
import { Component, ComponentSetup, JSXNode } from './component'
import { Key, ViewFlyNode } from './jsx-element'
import { DynamicRef } from './ref'

interface DiffContext {
  host: NativeNode,
  isParent: boolean,
  rootHost: NativeNode
}

export const ElementNamespaceMap = {
  svg: 'svg',
  math: 'mathml',
} as const

const listenerReg = /^on[A-Z]/

export function createRenderer(component: Component,
                               nativeRenderer: NativeRenderer,
                               namespace: ElementNamespace) {
  let isInit = true
  return function render(host: NativeNode) {
    if (isInit) {
      isInit = false
      const atom: Atom = {
        type: ComponentAtomType,
        index: 0,
        nodeType: component.type,
        jsxNode: component,
        sibling: null,
        child: null,
        nativeNode: null,
        namespace
      }
      componentRender(nativeRenderer, component, atom, {
        isParent: true,
        host,
        rootHost: host
      })
    } else {
      deepUpdateByComponentDirtyTree(nativeRenderer, component, false)
    }
  }
}

function buildView(nativeRenderer: NativeRenderer, parentComponent: Component, atom: Atom, context: DiffContext) {
  const { jsxNode, type } = atom
  if (type === ComponentAtomType) {
    const component = new Component(
      parentComponent,
      (jsxNode as ViewFlyNode<ComponentSetup>).type,
      (jsxNode as ViewFlyNode<ComponentSetup>).props,
      (jsxNode as ViewFlyNode<ComponentSetup>).key
    )
    atom.jsxNode = component
    componentRender(nativeRenderer, component, atom, context)
  } else if (type === ElementAtomType) {
    createElement(nativeRenderer, atom, parentComponent, context)
  } else {
    createTextNode(nativeRenderer, atom, context)
  }
}

function buildElementChildren(
  atom: ElementAtom,
  nativeRenderer: NativeRenderer,
  parentComponent: Component,
  context: DiffContext) {
  let child = atom.child
  while (child) {
    buildView(nativeRenderer, parentComponent, child, context)
    child = child.sibling
  }
}

function patchComponent(nativeRenderer: NativeRenderer,
                        component: Component,
                        oldChildAtom: Atom | null,
                        newAtom: ComponentAtom,
                        context: DiffContext,
                        needMove: boolean) {
  const newTemplate = component.rerender()
  newAtom.child = createChildChain(newTemplate, newAtom.namespace)
  diff(nativeRenderer, component, newAtom.child, oldChildAtom, context, needMove)
}

function deepUpdateByComponentDirtyTree(nativeRenderer: NativeRenderer, component: Component, needMove: boolean) {
  if (component.dirty) {
    const canUpdate = component.canUpdate(component.props, component.props)
    if (canUpdate) {
      const { atom, host, isParent, rootHost } = component.viewMetadata
      const context = {
        host,
        isParent,
        rootHost
      }
      const diffAtom = atom.child
      patchComponent(nativeRenderer, component, diffAtom, atom, context, needMove)
      const next = atom.sibling
      if (next && next.jsxNode instanceof Component) {
        const view = next.jsxNode.viewMetadata
        view.host = context.host
        view.isParent = context.isParent
      }
    }
    component.rendered()
  } else if (component.changed) {
    component.changedSubComponents.forEach(child => {
      deepUpdateByComponentDirtyTree(nativeRenderer, child, needMove)
    })
    component.rendered()
  }
}

interface UpdateParams<T extends Atom> {
  newAtom: T
  oldAtom: T
  nativeRenderer: NativeRenderer
  context: DiffContext
  parentComponent: Component

  effect(): void
}

interface Update {
  params: UpdateParams<Atom>

  callback(params: UpdateParams<Atom>, offset: number, needMove: boolean): void
}

function diff(
  nativeRenderer: NativeRenderer,
  parentComponent: Component,
  newAtom: Atom | null,
  oldAtom: Atom | null,
  context: DiffContext,
  needMove: boolean
) {
  const commits: Update[] = []

  function changeOffset() {
    offset++
  }

  while (newAtom) {
    oldAtom = createChanges(
      newAtom,
      oldAtom,
      nativeRenderer,
      commits,
      context,
      parentComponent,
      changeOffset
    )
    newAtom = newAtom.sibling
  }
  let dirtyDiffAtom = oldAtom
  while (dirtyDiffAtom) {
    cleanView(nativeRenderer, dirtyDiffAtom, true)
    dirtyDiffAtom = dirtyDiffAtom.sibling
  }

  let offset = 0
  const len = commits.length
  for (let i = 0; i < len; i++) {
    const commit = commits[i]
    while (oldAtom) {
      if (oldAtom.index <= i) {
        offset--
        oldAtom = oldAtom.sibling
        continue
      }
      break
    }
    commit.callback(commit.params, offset, needMove)
  }
}

function createChanges(
  newAtom: Atom,
  oldAtom: Atom | null,
  nativeRenderer: NativeRenderer,
  commits: Update[],
  context: DiffContext,
  parentComponent: Component,
  effect: () => void
): Atom | null {
  const startDiffAtom = oldAtom
  let prev: Atom | null = null
  while (oldAtom) {
    const newAtomType = newAtom.type
    if (oldAtom.type === newAtomType && oldAtom.nodeType === newAtom.nodeType && oldAtom.key === newAtom.key) {

      commits.push({
        callback: newAtomType === TextAtomType ? updateText :
          newAtomType === ComponentAtomType ? updateComponent :
            updateElement,
        params: {
          oldAtom,
          newAtom,
          nativeRenderer,
          context,
          effect,
          parentComponent
        }
      })
      const next = oldAtom.sibling
      if (!prev) {
        return next
      }
      prev.sibling = next
      return startDiffAtom
    }
    prev = oldAtom
    oldAtom = oldAtom.sibling
  }
  commits.push({
    callback: patchUpdate,
    params: {
      oldAtom: oldAtom!,
      newAtom,
      nativeRenderer,
      context,
      effect,
      parentComponent
    }
  })
  return startDiffAtom
}

function patchUpdate(params: UpdateParams<Atom>) {
  const { nativeRenderer, parentComponent, newAtom, context, effect } = params
  buildView(nativeRenderer, parentComponent, newAtom, context)
  effect()
}

function updateText(params: UpdateParams<TextAtom>, offset: number, needMove: boolean) {
  const { oldAtom, newAtom, nativeRenderer, context } = params
  const nativeNode = oldAtom.nativeNode!
  newAtom.nativeNode = nativeNode
  if (needMove || newAtom.index - offset !== oldAtom.index) {
    insertNode(nativeRenderer, newAtom, context)
  }
  context.host = nativeNode
  context.isParent = false
}

function updateElement(
  params: UpdateParams<ElementAtom>,
  offset: number,
  needMove: boolean) {
  const { nativeRenderer, newAtom, oldAtom, context, parentComponent } = params
  newAtom.nativeNode = oldAtom.nativeNode
  if (needMove || newAtom.index - offset !== oldAtom.index) {
    insertNode(nativeRenderer, newAtom, context)
  }
  context.host = newAtom.nativeNode!
  context.isParent = false
  updateNativeNodeProperties(
    nativeRenderer,
    newAtom,
    oldAtom,
    parentComponent,
    {
      host: newAtom.nativeNode!,
      isParent: true,
      rootHost: context.rootHost
    }
  )
}

function updateComponent(params: UpdateParams<ComponentAtom>,
                                 offset: number,
                                 needMove: boolean) {
  const { oldAtom, newAtom, nativeRenderer } = params
  let context = params.context
  const component = oldAtom.jsxNode as Component

  const portalHost = component.instance.$portalHost
  context = portalHost ? { isParent: true, host: portalHost, rootHost: portalHost } : context
  component.viewMetadata = {
    atom: newAtom,
    ...context
  }
  const newProps = newAtom.jsxNode.props
  newAtom.jsxNode = component

  needMove = needMove || newAtom.index - offset !== oldAtom.index

  const canUpdate = component.canUpdate(component.props, newProps)
  const propsIsChanged = hasChange(newProps, component.props)
  if (propsIsChanged) {
    component.updateProps(newProps)
  }
  if (canUpdate && (propsIsChanged || component.dirty)) {
    patchComponent(nativeRenderer, component, oldAtom.child, newAtom, context, needMove)
    const next = oldAtom.sibling
    if (next && next.jsxNode instanceof Component) {
      const view = next.jsxNode.viewMetadata
      view.host = context.host
      view.isParent = context.isParent
    }
  } else {
    newAtom.child = oldAtom.child
    reuseComponentView(nativeRenderer, newAtom.child, context, needMove, true)
  }
  component.rendered()
}


function reuseComponentView(nativeRenderer: NativeRenderer,
                            child: Atom | null,
                            context: DiffContext,
                            moveView: boolean,
                            skipSubComponentDiff: boolean) {
  const updateContext = (atom: Atom) => {
    if (atom.jsxNode instanceof Component) {
      reuseComponentView(nativeRenderer, atom.child, context, moveView, skipSubComponentDiff)
      if (!skipSubComponentDiff) {
        deepUpdateByComponentDirtyTree(nativeRenderer, atom.jsxNode, moveView)
      }
    } else {
      if (moveView) {
        insertNode(nativeRenderer, atom, context)
      }

      reuseElementChildrenView(nativeRenderer, atom as ElementAtom, context, skipSubComponentDiff)

      context.isParent = false
      context.host = atom.nativeNode!
    }
  }
  while (child) {
    updateContext(child)
    child = child.sibling
  }
}

function reuseElementChildrenView(nativeRenderer: NativeRenderer, atom: ElementAtom, context: DiffContext, skipSubComponentDiff: boolean) {
  let child = atom.child
  while (child) {
    if (child.jsxNode instanceof Component) {
      deepUpdateByComponentDirtyTree(nativeRenderer, child.jsxNode, false)
    } else {
      reuseElementChildrenView(nativeRenderer, child as ElementAtom, context, skipSubComponentDiff)
    }
    child = child.sibling
  }
}

function cleanElementChildren(atom: ElementAtom, nativeRenderer: NativeRenderer) {
  let child: Atom | null = atom.child
  nativeRenderer.cleanChildren(atom.nativeNode as NativeNode, atom.namespace)
  while (child) {
    cleanView(nativeRenderer, child, false)
    child = child.sibling
  }
}


function cleanView(nativeRenderer: NativeRenderer, atom: Atom, needClean: boolean) {
  if (atom.type === ComponentAtomType) {
    const jsxNode = atom.jsxNode as Component
    if (jsxNode.instance.$portalHost) {
      needClean = true
    }
    cleanChildren(atom, nativeRenderer, needClean)
    jsxNode.destroy()
    return
  }
  if (needClean) {
    nativeRenderer.remove(atom.nativeNode!, atom.namespace)
    needClean = false
  }
  if (atom.type === ElementAtomType) {
    const ref = atom.jsxNode.props[refKey]
    applyRefs(ref, atom.nativeNode!, false)
  }
  cleanChildren(atom, nativeRenderer, needClean)
}

function cleanChildren(atom: Atom, nativeRenderer: NativeRenderer, needClean: boolean) {
  let child = atom.child
  while (child) {
    cleanView(nativeRenderer, child, needClean)
    child = child.sibling
  }
}

function componentRender(nativeRenderer: NativeRenderer, component: Component, from: ComponentAtom, context: DiffContext) {
  component.render((template, portalHost) => {
    from.child = createChildChain(template, from.namespace)
    context = portalHost ? { isParent: true, host: portalHost, rootHost: portalHost } : context
    component.viewMetadata = {
      atom: from,
      ...context
    }
    let child = from.child
    while (child) {
      buildView(nativeRenderer, component, child, context)
      child = child.sibling
    }
  })
}

/* eslint-disable-next-line */
function createChainByJSXNode(type: TextAtom['type'], jsxNode: string, nodeType: string, prevAtom: Atom, namespace: ElementNamespace, key?: Key): TextAtom
/* eslint-disable-next-line */
function createChainByJSXNode(type: ElementAtom['type'], jsxNode: ViewFlyNode<string>, nodeType: string, prevAtom: Atom, namespace: ElementNamespace, key?: Key): ElementAtom
/* eslint-disable-next-line */
function createChainByJSXNode(type: ComponentAtom['type'], jsxNode: ViewFlyNode<ComponentSetup>, nodeType: string, prevAtom: Atom, namespace: ElementNamespace, key?: Key): ComponentAtom
function createChainByJSXNode(type: any, jsxNode: any, nodeType: string, prevAtom: Atom, namespace: ElementNamespace, key?: Key): Atom {
  const atom: Atom = {
    type,
    index: prevAtom.index + 1,
    jsxNode,
    sibling: null,
    child: null,
    nativeNode: null,
    namespace,
    nodeType,
    key
  }
  prevAtom.sibling = atom
  return atom
}

function createChainByNode(jsxNode: any, prevAtom: Atom, elementNamespace: ElementNamespace) {
  const type = typeof jsxNode
  if (jsxNode != null && type !== 'boolean') {
    if (type === 'string') {
      return createChainByJSXNode(TextAtomType, jsxNode, jsxNode, prevAtom, elementNamespace)
    }
    if (type === 'object') {
      if (Array.isArray(jsxNode)) {
        return createChainByChildren(jsxNode, prevAtom, elementNamespace)
      }
      const nodeType = typeof jsxNode.type
      if (nodeType === 'string') {
        return createChainByJSXNode(
          ElementAtomType,
          jsxNode,
          jsxNode.type,
          prevAtom,
          elementNamespace || ElementNamespaceMap[jsxNode.type as keyof typeof ElementNamespaceMap],
          jsxNode.key)
      } else if (nodeType === 'function') {
        return createChainByJSXNode(ComponentAtomType, jsxNode, jsxNode.type, prevAtom, elementNamespace, jsxNode.key)
      }
    }
    const text = String(jsxNode)
    return createChainByJSXNode(TextAtomType, text, text, prevAtom, elementNamespace)
  }
  return prevAtom
}

function createChainByChildren(children: JSXNode[], prevAtom: Atom, elementNamespace: ElementNamespace) {
  const len = children.length
  for (let i = 0; i < len; i++) {
    const item = children[i]
    prevAtom = createChainByNode(item, prevAtom, elementNamespace)
  }
  return prevAtom
}

function createChildChain(template: JSXNode, namespace: ElementNamespace) {
  const beforeAtom = { sibling: null, index: -1 } as Atom
  createChainByNode(template, beforeAtom, namespace)
  return beforeAtom.sibling
}

function insertNode(nativeRenderer: NativeRenderer, atom: Atom, context: DiffContext) {
  if (context.isParent) {
    if (context.host === context.rootHost) {
      nativeRenderer.appendChild(context.host, atom.nativeNode!, atom.namespace)
    } else {
      nativeRenderer.prependChild(context.host, atom.nativeNode!, atom.namespace)
    }
  } else {
    nativeRenderer.insertAfter(atom.nativeNode!, context.host, atom.namespace)
  }
}

function createElementChildren(type: string, children: JSXNode, namespace: ElementNamespace) {
  if (type === 'foreignObject' && namespace === ElementNamespaceMap.svg) {
    return createChildChain(children, void 0)
  }
  return createChildChain(children, namespace)
}

function createElement(nativeRenderer: NativeRenderer, atom: ElementAtom, parentComponent: Component, context: DiffContext) {
  const { namespace, jsxNode } = atom
  const nativeNode = nativeRenderer.createElement(jsxNode.type, namespace)
  const props = jsxNode.props
  let bindingRefs: any

  for (const key in props) {
    if (key === 'children') {
      atom.child = createElementChildren(jsxNode.type, props.children, namespace)
      continue
    }
    if (key === 'class') {
      const className = classToString(props[key])
      if (className) {
        nativeRenderer.setClass(nativeNode, className, namespace)
      }
      continue
    }
    if (key === 'style') {
      const style = styleToObject(props.style)
      for (const key in style) {
        nativeRenderer.setStyle(nativeNode, key, style[key], namespace)
      }
      continue
    }
    if (listenerReg.test(key)) {
      const listener = props[key]
      if (typeof listener === 'function') {
        nativeRenderer.listen(nativeNode, key, listener, namespace)
      }
      continue
    }
    if (key === refKey) {
      bindingRefs = props[key]
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, props[key], namespace)
  }
  atom.nativeNode = nativeNode
  insertNode(nativeRenderer, atom, context)
  buildElementChildren(atom, nativeRenderer, parentComponent, {
    isParent: true,
    host: nativeNode,
    rootHost: context.rootHost
  })
  context.host = nativeNode
  context.isParent = false
  applyRefs(bindingRefs, nativeNode, true)
}

function createTextNode(nativeRenderer: NativeRenderer, atom: TextAtom, context: DiffContext) {
  const nativeNode = nativeRenderer.createTextNode(atom.jsxNode, atom.namespace)
  atom.nativeNode = nativeNode
  insertNode(nativeRenderer, atom, context)
  context.host = nativeNode
  context.isParent = false
}

function updateNativeNodeProperties(
  nativeRenderer: NativeRenderer,
  newAtom: ElementAtom,
  oldAtom: ElementAtom,
  parentComponent: Component,
  context: DiffContext) {
  const newVNode = newAtom.jsxNode
  const isSvg = newAtom.namespace
  const nativeNode = newAtom.nativeNode!
  const oldVNode = oldAtom.jsxNode
  if (newVNode === oldVNode) {
    newAtom.child = oldAtom.child
    reuseElementChildrenView(nativeRenderer, newAtom, context, false)
    return
  }

  let unBindRefs: any
  let bindRefs: any
  let updatedChildren = false

  comparePropsWithCallbacks(oldVNode.props, newVNode.props, (key, oldValue) => {
    if (key === 'children') {
      updatedChildren = true
      cleanElementChildren(oldAtom, nativeRenderer)
      return
    }
    if (key === 'class') {
      nativeRenderer.setClass(nativeNode, '', isSvg)
      return
    }
    if (key === 'style') {
      for (const styleName in styleToObject(oldValue)) {
        nativeRenderer.removeStyle(nativeNode, styleName, isSvg)
      }
      return
    }
    if (listenerReg.test(key)) {
      if (typeof oldValue === 'function') {
        nativeRenderer.unListen(nativeNode, key, oldValue, isSvg)
      }
      return
    }
    if (key === refKey) {
      unBindRefs = oldValue
      return
    }
    nativeRenderer.removeProperty(nativeNode, key, isSvg)
  }, (key, value) => {
    if (key === 'children') {
      updatedChildren = true
      newAtom.child = createElementChildren(newVNode.type, value, isSvg)
      buildElementChildren(newAtom, nativeRenderer, parentComponent, context)
      return
    }
    if (key === 'class') {
      nativeRenderer.setClass(nativeNode, classToString(value), isSvg)
      return
    }
    if (key === 'style') {
      const styleObj = styleToObject(value)
      for (const styleName in styleObj) {
        nativeRenderer.setStyle(nativeNode, styleName, styleObj[styleName], isSvg)
      }
      return
    }
    if (listenerReg.test(key)) {
      if (typeof value === 'function') {
        nativeRenderer.listen(nativeNode, key, value, isSvg)
      }
      return
    }
    if (key === refKey) {
      bindRefs = value
      return
    }
    nativeRenderer.setProperty(nativeNode, key, value, isSvg)
  }, (key, newValue, oldValue) => {
    if (key === 'children') {
      updatedChildren = true
      newAtom.child = createElementChildren(newVNode.type, newValue, isSvg)
      if (!newAtom.child) {
        cleanElementChildren(oldAtom, nativeRenderer)
      } else if (!oldAtom.child) {
        buildElementChildren(newAtom, nativeRenderer, parentComponent, context)
      } else {
        diff(nativeRenderer, parentComponent, newAtom.child, oldAtom.child, context, false)
      }
      return
    }
    if (key === 'class') {
      const oldClassName = classToString(oldValue)
      const newClassName = classToString(newValue)
      if (oldClassName !== newClassName) {
        nativeRenderer.setClass(nativeNode, newClassName, isSvg)
      }
      return
    }
    if (key === 'style') {
      comparePropsWithCallbacks(styleToObject(oldValue), styleToObject(newValue), styleName => {
        nativeRenderer.removeStyle(nativeNode, styleName, isSvg)
      }, (styleName, styleValue) => {
        nativeRenderer.setStyle(nativeNode, styleName, styleValue, isSvg)
      }, (styleName, styleValue) => {
        nativeRenderer.setStyle(nativeNode, styleName, styleValue, isSvg)
      })
      return
    }
    if (listenerReg.test(key)) {
      nativeRenderer.unListen(nativeNode, key, oldValue, isSvg)
      nativeRenderer.listen(nativeNode, key, newValue, isSvg)
      return
    }
    if (key === refKey) {
      unBindRefs = oldValue
      bindRefs = newValue
      return
    }
    nativeRenderer.setProperty(nativeNode, key, newValue, isSvg)
  })

  if (!updatedChildren) {
    newAtom.child = oldAtom.child
    reuseElementChildrenView(nativeRenderer, newAtom, context, false)
  }
  applyRefs(unBindRefs, nativeNode, false)
  applyRefs(bindRefs!, nativeNode, true)
}

function applyRefs(refs: any, nativeNode: NativeNode, binding: boolean) {
  if (refs) {
    const refList: any[] = Array.isArray(refs) ? refs : [refs]
    const len = refList.length
    for (let i = 0; i < len; i++) {
      const item = refList[i]
      if (item instanceof DynamicRef) {
        binding ? item.bind(nativeNode) : item.unBind(nativeNode)
      }
    }
  }
}
