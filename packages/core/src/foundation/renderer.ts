import { NativeNode, NativeRenderer } from './injection-tokens'
import {
  Atom,
  classToString,
  ComponentAtom,
  ComponentAtomType,
  ComponentView,
  ElementAtom,
  ElementAtomType,
  getObjectChanges,
  refKey,
  styleToObject,
  TextAtom,
  TextAtomType
} from './_utils'
import { Component, ComponentSetup, DynamicRef, JSXNode } from './component'
import { Key, ViewFlyNode } from './jsx-element'

interface DiffContext {
  host: NativeNode,
  isParent: boolean,
  rootHost: NativeNode
}

const componentViewCache = new WeakMap<Component, ComponentView>()

const listenerReg = /^on[A-Z]/

export function createRenderer(component: Component, nativeRenderer: NativeRenderer) {
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
  const childContext: DiffContext = {
    isParent: true,
    host: atom.nativeNode!,
    rootHost: context.rootHost
  }
  let child = atom.child
  while (child) {
    buildView(nativeRenderer, parentComponent, child, childContext)
    child = child.sibling
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
  const { atom, host, isParent, rootHost } = componentViewCache.get(component)!
  const diffAtom = atom.child
  const template = component.update(component.props)
  atom.child = createChildChain(template, atom.isSvg)

  const context: DiffContext = {
    host,
    isParent,
    rootHost
  }
  diff(nativeRenderer, component, atom.child, diffAtom, context, false)

  const next = atom.sibling
  if (next && next.jsxNode instanceof Component) {
    const view = componentViewCache.get(next.jsxNode)!
    view.host = context.host
    view.isParent = context.isParent
  }
}

type UpdateFn = (offset: number, needMove: boolean) => void

function diff(
  nativeRenderer: NativeRenderer,
  parentComponent: Component,
  newAtom: Atom | null,
  oldAtom: Atom | null,
  context: DiffContext,
  needMove: boolean
) {
  const commits: UpdateFn[] = []

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
  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i]
    while (oldAtom) {
      if (oldAtom.index <= i) {
        offset--
        oldAtom = oldAtom.sibling
        continue
      }
      break
    }
    commit(offset, needMove)
  }
}

function createChanges(
  newAtom: Atom,
  oldAtom: Atom | null,
  nativeRenderer: NativeRenderer,
  commits: UpdateFn[],
  context: DiffContext,
  parentComponent: Component,
  effect: () => void
): Atom | null {
  const startDiffAtom = oldAtom
  let prev: Atom | null = null
  while (oldAtom) {
    const newAtomType = newAtom.type
    if (oldAtom.type === newAtomType && oldAtom.nodeType === newAtom.nodeType && oldAtom.key === newAtom.key) {
      let commit: UpdateFn
      if (newAtomType === TextAtomType) {
        commit = updateText(newAtom, oldAtom as TextAtom, nativeRenderer, context)
      } else if (newAtomType === ComponentAtomType) {
        commit = updateComponent(newAtom, oldAtom as ComponentAtom, nativeRenderer, context)
      } else {
        commit = updateElement(newAtom, oldAtom as ElementAtom, nativeRenderer, context, parentComponent)
      }

      commits.push(commit)
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
  return function (offset: number, needMove: boolean) {
    const nativeNode = oldAtom.nativeNode!
    newAtom.nativeNode = nativeNode
    if (needMove || newAtom.index - offset !== oldAtom.index) {
      insertNode(nativeRenderer, newAtom, context)
    }
    context.host = nativeNode
    context.isParent = false
  }
}

function updateElement(
  newAtom: ElementAtom,
  oldAtom: ElementAtom,
  nativeRenderer: NativeRenderer,
  context: DiffContext,
  parentComponent: Component
) {
  return function (offset: number, needMove: boolean) {
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
      context)
  }
}

function updateComponent(
  newAtom: ComponentAtom,
  reusedAtom: ComponentAtom,
  nativeRenderer: NativeRenderer,
  context: DiffContext
) {
  return function (offset: number, needMove: boolean) {
    const component = reusedAtom.jsxNode as Component
    const newProps = (newAtom.jsxNode as ViewFlyNode<ComponentSetup>).props
    const oldTemplate = component.template
    const newTemplate = component.update(newProps)
    const portalHost = component.instance.$portalHost
    context = portalHost ? { isParent: true, host: portalHost, rootHost: portalHost } : context
    componentViewCache.set(component, {
      atom: newAtom,
      ...context
    })
    newAtom.jsxNode = component

    if (newTemplate === oldTemplate) {
      newAtom.child = reusedAtom.child
      reuseComponentView(nativeRenderer, newAtom.child, context, needMove || newAtom.index - offset !== reusedAtom.index)
      component.rendered()
      return
    }
    if (newTemplate) {
      newAtom.child = createChildChain(newTemplate, newAtom.isSvg)
    }
    if (newAtom.child) {
      diff(nativeRenderer, component, newAtom.child, reusedAtom.child, context, needMove || newAtom.index - offset !== reusedAtom.index)
    } else if (reusedAtom.child) {
      let atom: Atom | null = reusedAtom.child
      while (atom) {
        cleanView(nativeRenderer, atom, true)
        atom = atom.sibling
      }
    }
    component.rendered()
  }
}

function reuseComponentView(nativeRenderer: NativeRenderer, child: Atom | null, context: DiffContext, moveView: boolean) {
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

function cleanElementChildren(atom: ElementAtom, nativeRenderer: NativeRenderer) {
  let child: Atom | null = atom.child
  nativeRenderer.cleanChildren(atom.nativeNode as NativeNode, atom.isSvg)
  while (child) {
    cleanView(nativeRenderer, child, false)
    child = child.sibling
  }
}


function cleanView(nativeRenderer: NativeRenderer, atom: Atom, needClean: boolean) {
  if (atom.nativeNode) {
    if (needClean) {
      nativeRenderer.remove(atom.nativeNode, atom.isSvg)
      needClean = false
    }
    if (atom.type === ElementAtomType) {
      const ref = atom.jsxNode.props[refKey]
      applyRefs(ref, atom.nativeNode, false)
    }
  }

  let child = atom.child
  while (child) {
    if (child.jsxNode instanceof Component && child.jsxNode.instance.$portalHost) {
      needClean = true
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
  componentViewCache.set(component, {
    atom: from,
    ...context
  })
  let child = from.child
  while (child) {
    buildView(nativeRenderer, component, child, context)
    child = child.sibling
  }
  component.rendered()
}

/* eslint-disable-next-line */
function createChainByJSXNode(type: TextAtom['type'], jsxNode: string, nodeType: string, prevAtom: Atom, isSvg: boolean, key?: Key): TextAtom
/* eslint-disable-next-line */
function createChainByJSXNode(type: ElementAtom['type'], jsxNode: ViewFlyNode<string>, nodeType: string, prevAtom: Atom, isSvg: boolean, key?: Key): ElementAtom
/* eslint-disable-next-line */
function createChainByJSXNode(type: ComponentAtom['type'], jsxNode: ViewFlyNode<ComponentSetup>, nodeType: string, prevAtom: Atom, isSvg: boolean, key?: Key): ComponentAtom
function createChainByJSXNode(type: any, jsxNode: any, nodeType: string, prevAtom: Atom, isSvg: boolean, key?: Key): Atom {
  const atom: Atom = {
    type,
    index: prevAtom.index + 1,
    jsxNode,
    sibling: null,
    child: null,
    nativeNode: null,
    isSvg,
    nodeType,
    key
  }
  prevAtom.sibling = atom
  return atom
}

function createChainByNode(jsxNode: JSXNode, prevAtom: Atom, isSvg: boolean) {
  const type = typeof jsxNode
  if (jsxNode !== null && type !== 'undefined' && type !== 'boolean') {
    if (typeof jsxNode === 'string') {
      return createChainByJSXNode(TextAtomType, jsxNode, jsxNode, prevAtom, isSvg)
    }
    if (Array.isArray(jsxNode)) {
      return createChainByChildren(jsxNode, prevAtom, isSvg)
    }
    if (type === 'object') {
      const nodeType = typeof jsxNode.type
      if (nodeType === 'string') {
        return createChainByJSXNode(ElementAtomType, jsxNode, jsxNode.type, prevAtom, isSvg || jsxNode.type === 'svg', jsxNode.key)
      } else if (nodeType === 'function') {
        return createChainByJSXNode(ComponentAtomType, jsxNode, jsxNode.type, prevAtom, isSvg, jsxNode.key)
      }
    }
    const text = String(jsxNode)
    return createChainByJSXNode(TextAtomType, text, text, prevAtom, isSvg)
  }
  return prevAtom
}

function createChainByChildren(children: JSXNode[], prevAtom: Atom, isSvg: boolean) {
  for (const item of children) {
    prevAtom = createChainByNode(item, prevAtom, isSvg)
  }
  return prevAtom
}

function createChildChain(template: JSXNode, isSvg: boolean) {
  const beforeAtom = { sibling: null, index: -1 } as Atom
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

function createElement(nativeRenderer: NativeRenderer, atom: ElementAtom, parentComponent: Component, context: DiffContext) {
  const { isSvg, jsxNode } = atom
  const nativeNode = nativeRenderer.createElement(jsxNode.type, isSvg)
  const props = jsxNode.props
  let bindingRefs: any

  for (const key in props) {
    if (key === 'children') {
      atom.child = createChildChain(jsxNode.props.children, isSvg)
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
        nativeRenderer.listen(nativeNode, key, listener, isSvg)
      }
      continue
    }
    if (key === refKey) {
      bindingRefs = props[key]
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, props[key], isSvg)
  }
  atom.nativeNode = nativeNode
  insertNode(nativeRenderer, atom, context)
  buildElementChildren(atom, nativeRenderer, parentComponent, context)
  context.host = nativeNode
  context.isParent = false
  applyRefs(bindingRefs, nativeNode, true)
}

function createTextNode(nativeRenderer: NativeRenderer, atom: TextAtom, context: DiffContext) {
  const nativeNode = nativeRenderer.createTextNode(atom.jsxNode, atom.isSvg)
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
  const isSvg = newAtom.isSvg
  const nativeNode = newAtom.nativeNode!
  const oldVNode = oldAtom.jsxNode
  if (newVNode === oldVNode) {
    updateElementChildren(newAtom, oldAtom, nativeRenderer, parentComponent, context, isSvg)
    return
  }
  const changes = getObjectChanges(newVNode.props, oldVNode.props)
  let unBindRefs: any
  let bindRefs: any

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
        nativeRenderer.unListen(nativeNode, key, value, isSvg)
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
      nativeRenderer.unListen(nativeNode, key, oldValue, isSvg)
      nativeRenderer.listen(nativeNode, key, newValue, isSvg)
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
        nativeRenderer.listen(nativeNode, key, value, isSvg)
      }
      continue
    }
    if (key === refKey) {
      bindRefs = value
      continue
    }
    nativeRenderer.setProperty(nativeNode, key, value, isSvg)
  }

  updateElementChildren(newAtom, oldAtom, nativeRenderer, parentComponent, context, isSvg)
  applyRefs(unBindRefs, nativeNode, false)
  applyRefs(bindRefs!, nativeNode, true)
}

function updateElementChildren(newAtom: ElementAtom,
                               oldAtom: ElementAtom,
                               nativeRenderer: NativeRenderer,
                               parentComponent: Component,
                               context: DiffContext,
                               isSvg: boolean) {
  /**
   * 不能仅依赖 children 是否相等的判断来确定是否要继续向下 diff
   * 如：
   * ```tsx
   * <Comp>
   *   <div>
   *     {props.children}
   *   </div>
   * </Comp>
   * ```
   * 其中当 Comp 产生变化时，children 来自父组件，这时 children 是相等的，
   * 但，children 内可能有子组件也发生了变化，如果不继续 diff，那么，子组件
   * 的视图更新将不会发生
   */
  newAtom.child = createChildChain(newAtom.jsxNode.props.children, isSvg)
  if (!newAtom.child) {
    // 防止删除用户手动添加的元素
    if (oldAtom.child) {
      cleanElementChildren(oldAtom, nativeRenderer)
    }
  } else {
    diff(nativeRenderer, parentComponent, newAtom.child, oldAtom.child, {
      host: newAtom.nativeNode!,
      isParent: true,
      rootHost: context.rootHost
    }, false)
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
