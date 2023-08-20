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
  prev?: DiffAtomIndexed | null
  next?: DiffAtomIndexed | null
}

export function createRenderer(component: Component, nativeRenderer: NativeRenderer, version: string) {
  let isInit = true
  return function render(host: NativeNode) {
    if (isInit) {
      nativeRenderer.setProperty(host, 'viewfly-version', version)
      isInit = false
      const atom: Atom = {
        jsxNode: component,
        parent: null,
        sibling: null,
        child: null,
        nativeNode: null
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
      const { nativeNode: n, applyRefs: a } = createElement(nativeRenderer, atom.jsxNode)
      nativeNode = n
      applyRefs = a
    } else {
      nativeNode = createTextNode(nativeRenderer, atom.jsxNode as JSXText)
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

  const changeCommits: ChangeCommits = {
    updateComponent: (newAtom: Atom, reusedAtom: Atom, expectIndex: number, diffIndex: number) => {
      commits.push((offset) => {
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
          reuseComponentView(nativeRenderer, newAtom, reusedAtom, context, expectIndex !== diffIndex - offset)
          updateView(nativeRenderer, instance)
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
        instance.rendered()
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
    firstDiffAtomIndexed = createChanges(newAtom, expectIndex, firstDiffAtomIndexed, changeCommits)
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
        offset++
        firstDiffAtomIndexed = firstDiffAtomIndexed.next as DiffAtomIndexed
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
    if (atom.jsxNode instanceof Component) {
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

function createChanges(
  newAtom: Atom,
  expectIndex: number,
  diffAtomIndexed: DiffAtomIndexed | null,
  changeCommits: ChangeCommits
): DiffAtomIndexed | null {
  const startDiffAtom = diffAtomIndexed
  while (diffAtomIndexed) {
    const { atom: diffAtom, index: diffIndex } = diffAtomIndexed
    const key = (newAtom.jsxNode as any).key
    const diffKey = (diffAtom.jsxNode as any).key

    if (key !== undefined && diffKey !== undefined) {
      if (diffKey !== key) {
        diffAtomIndexed = diffAtomIndexed.next as DiffAtomIndexed
        continue
      }
    }
    if (newAtom.jsxNode.$$typeOf === diffAtom.jsxNode.$$typeOf) {
      if (newAtom.jsxNode instanceof JSXElement) {
        changeCommits.updateElement(newAtom, diffAtom, expectIndex, diffIndex)
      } else if (newAtom.jsxNode instanceof JSXText) {
        changeCommits.updateText(newAtom, diffAtom)
      } else {
        changeCommits.updateComponent(newAtom, diffAtom, expectIndex, diffIndex)
      }
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
  changeCommits.create(newAtom)
  return startDiffAtom
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

function createChainByComponentFactory(jsxComponent: JSXComponent, parent: Atom): Atom {
  return {
    jsxNode: jsxComponent,
    parent,
    sibling: null,
    child: null,
    nativeNode: null
  }
}

function createChainByJSXElement(component: Component, element: JSXElement, parent: Atom) {
  const atom: Atom = {
    jsxNode: element,
    parent,
    sibling: null,
    child: null,
    nativeNode: null
  }
  if (Reflect.has(element.props, 'children')) {
    const jsxChildren = element.props.children
    const children = createChainByChildren(component, Array.isArray(jsxChildren) ? jsxChildren : [jsxChildren], atom, [])
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

function createChainByChildren(component: Component, children: JSXInternal.JSXNode[], parent: Atom, atoms: Atom[]): Atom[] {
  for (const item of children) {
    if (item !== null && typeof item !== 'undefined') {
      if (item instanceof JSXElement) {
        atoms.push(createChainByJSXElement(component, item, parent))
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
        createChainByChildren(component, item, parent, atoms)
        continue
      }
      atoms.push(createChainByJSXText(new JSXText(String(item)), parent))
    }
  }
  return atoms
}

function linkTemplate(template: JSXInternal.JSXNode, component: Component, parent: Atom) {
  const children = Array.isArray(template) ? template : [template]
  const newChildren = createChainByChildren(component, children, parent, [])
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
