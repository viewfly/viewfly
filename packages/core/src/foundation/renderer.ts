import { NativeNode, NativeRenderer } from './injection-tokens'
import {
  Atom,
  classToString,
  ComponentAtom,
  ComponentAtomType,
  ComponentView,
  ElementAtom,
  ElementAtomType,
  ElementNamespace,
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

export const ElementNamespaceMap: Record<string, string> = {
  svg: 'svg',
  math: 'mathml',
}

const componentViewCache = new WeakMap<Component, ComponentView>()

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
      updateView(nativeRenderer, component, false)
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

function updateView(nativeRenderer: NativeRenderer, component: Component, needMove: boolean) {
  if (component.dirty) {
    const { atom, host, isParent, rootHost } = componentViewCache.get(component)!
    applyChanges(nativeRenderer, component, atom, {
      host,
      isParent,
      rootHost
    }, needMove)
  } else if (component.changed) {
    component.changedSubComponents.forEach(child => {
      updateView(nativeRenderer, child, needMove)
    })
    component.rendered()
  }
}

function applyChanges(nativeRenderer: NativeRenderer,
                      component: Component,
                      atom: ComponentAtom,
                      context: DiffContext,
                      needMove: boolean) {
  const diffAtom = atom.child
  component.update(component.props, newTemplate => {
    atom.child = createChildChain(newTemplate, atom.namespace)
    diff(nativeRenderer, component, atom.child, diffAtom, context, needMove)

    const next = atom.sibling
    if (next && next.jsxNode instanceof Component) {
      const view = componentViewCache.get(next.jsxNode)!
      view.host = context.host
      view.isParent = context.isParent
    }
  }, () => {
    // console.log(skipSubComponentDiff, '----')
    //
  })
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
      {
        host: newAtom.nativeNode!,
        isParent: true,
        rootHost: context.rootHost
      }
    )
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

    const portalHost = component.instance.$portalHost
    context = portalHost ? { isParent: true, host: portalHost, rootHost: portalHost } : context
    componentViewCache.set(component, {
      atom: newAtom,
      ...context
    })
    newAtom.jsxNode = component

    component.update(newProps, newTemplate => {
      if (newTemplate) {
        newAtom.child = createChildChain(newTemplate, newAtom.namespace)
      }
      if (newAtom.child) {
        diff(
          nativeRenderer,
          component,
          newAtom.child,
          reusedAtom.child,
          context,
          needMove || newAtom.index - offset !== reusedAtom.index
        )
      } else if (reusedAtom.child) {
        let atom: Atom | null = reusedAtom.child
        while (atom) {
          cleanView(nativeRenderer, atom, true)
          atom = atom.sibling
        }
      }
    }, (skipSubComponentDiff) => {
      newAtom.child = reusedAtom.child
      reuseComponentView(
        nativeRenderer,
        newAtom.child,
        context,
        needMove || newAtom.index - offset !== reusedAtom.index,
        skipSubComponentDiff
      )
    })
  }
}

function reuseComponentView(nativeRenderer: NativeRenderer,
                            child: Atom | null,
                            context: DiffContext,
                            moveView: boolean,
                            skipSubComponentDiff: boolean) {
  const updateContext = (atom: Atom) => {
    if (atom.jsxNode instanceof Component) {
      if (skipSubComponentDiff || !moveView) {
        let child = atom.child
        while (child) {
          updateContext(child)
          child = child.sibling
        }
      } else {
        applyChanges(nativeRenderer, atom.jsxNode, atom as ComponentAtom, context, true)
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
      updateView(nativeRenderer, child.jsxNode, false)
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
  if (atom.nativeNode) {
    if (needClean) {
      nativeRenderer.remove(atom.nativeNode, atom.namespace)
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

function componentRender(nativeRenderer: NativeRenderer, component: Component, from: ComponentAtom, context: DiffContext) {
  component.render((template, portalHost) => {
    from.child = createChildChain(template, from.namespace)
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
  if (jsxNode !== null && type !== 'undefined' && type !== 'boolean') {
    if (typeof jsxNode === 'string') {
      return createChainByJSXNode(TextAtomType, jsxNode, jsxNode, prevAtom, elementNamespace)
    }
    if (Array.isArray(jsxNode)) {
      return createChainByChildren(jsxNode, prevAtom, elementNamespace)
    }
    if (type === 'object') {
      const nodeType = typeof jsxNode.type
      if (nodeType === 'string') {
        return createChainByJSXNode(
          ElementAtomType,
          jsxNode,
          jsxNode.type,
          prevAtom,
          elementNamespace || ElementNamespaceMap[jsxNode.type],
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
  for (const item of children) {
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

function createElement(nativeRenderer: NativeRenderer, atom: ElementAtom, parentComponent: Component, context: DiffContext) {
  const { namespace, jsxNode } = atom
  const nativeNode = nativeRenderer.createElement(jsxNode.type, namespace)
  const props = jsxNode.props
  let bindingRefs: any

  for (const key in props) {
    if (key === 'children') {
      atom.child = createChildChain(jsxNode.props.children, namespace)
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
  const changes = getObjectChanges(newVNode.props, oldVNode.props)
  let unBindRefs: any
  let bindRefs: any

  let updatedChildren = false
  for (const [key, value] of changes.remove) {
    if (key === 'children') {
      updatedChildren = true
      cleanElementChildren(oldAtom, nativeRenderer)
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
      updatedChildren = true
      newAtom.child = createChildChain(newValue, isSvg)
      if (!newAtom.child) {
        cleanElementChildren(oldAtom, nativeRenderer)
      } else if (!oldAtom.child) {
        buildElementChildren(newAtom, nativeRenderer, parentComponent, context)
      } else {
        diff(nativeRenderer, parentComponent, newAtom.child, oldAtom.child, context, false)
      }
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
      updatedChildren = true
      newAtom.child = createChildChain(value, isSvg)
      buildElementChildren(newAtom, nativeRenderer, parentComponent, context)
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
    for (const item of refList) {
      if (item instanceof DynamicRef) {
        binding ? item.bind(nativeNode) : item.unBind(nativeNode)
      }
    }
  }
}
