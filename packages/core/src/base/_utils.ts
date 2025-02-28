import { Key, ViewFlyNode } from './jsx-element'
import { NativeNode } from './injection-tokens'
import { Component, ComponentSetup } from './component'

export function hasChange(newProps: Record<string, any>, oldProps: Record<string, any>): boolean {
  const newKeys = Object.keys(oldProps)
  const oldKeys = Object.keys(newProps)

  if (oldKeys.length !== newKeys.length) {
    return true
  }

  const len = oldKeys.length
  for (let i = 0; i < len; i++) {
    const key = newKeys[i]
    if (newProps[key] !== oldProps[key]) {
      return true
    }
  }
  return false
}

export const refKey = 'ref'

export function comparePropsWithCallbacks(
  oldProps: Record<string, any>,
  newProps: Record<string, any>,
  onDeleted: (key: string, oldValue: any) => void,
  onAdded: (key: string, value: any) => void,
  onUpdated: (key: string, newValue: any, oldValue: any) => void
) {
  for (const key in oldProps) {
    if (!(key in newProps)) {
      onDeleted(key, oldProps[key])
    }
  }

  for (const key in newProps) {
    if (!(key in oldProps)) {
      onAdded(key, newProps[key])
    } else if (oldProps[key] !== newProps[key]) {
      onUpdated(key, newProps[key], oldProps[key])
    }
  }
}

export function classToString(config: unknown) {
  if (typeof config === 'string') {
    return config
  }
  if (!config) {
    return ''
  }
  if (Array.isArray(config)) {
    const classes: string[] = []
    for (const i of config) {
      const v = classToString(i)
      if (v) {
        classes.push(v)
      }
    }
    return classes.join(' ')
  }
  if (typeof config === 'object') {
    if (config.toString !== Object.prototype.toString && !config.toString.toString().includes('[native code]')) {
      return config.toString()
    }
    const classes: string[] = []
    for (const key in config) {
      if ({}.hasOwnProperty.call(config, key) && (config as any)[key]) {
        classes.push(key)
      }
    }
    return classes.join(' ')
  }
  return ''
}

export function styleToObject(style: string | Record<string, any>) {
  if (typeof style !== 'string') {
    return style || {}
  }
  const obj: Record<string, any> = {}
  style.split(';').map(s => s.split(':')).forEach(v => {
    if (!v[0] || !v[1]) {
      return
    }
    obj[v[0].trim()] = v[1].trim()
  })
  return obj
}

export const TextAtomType = Symbol('Text')
export const ElementAtomType = Symbol('Element')
export const ComponentAtomType = Symbol('Component')

export type ElementNamespace = string | undefined

export interface TextAtom {
  type: typeof TextAtomType
  index: number
  jsxNode: string
  nodeType: string
  key?: null
  nativeNode: NativeNode | null
  child: Atom | null
  sibling: Atom | null
  namespace: ElementNamespace
}

export interface ElementAtom {
  type: typeof ElementAtomType
  index: number
  nodeType: string
  key?: Key
  jsxNode: ViewFlyNode<string>
  nativeNode: NativeNode | null
  child: Atom | null
  sibling: Atom | null
  namespace: ElementNamespace
}

export interface ComponentAtom {
  type: typeof ComponentAtomType
  index: number
  nodeType: ComponentSetup
  key?: Key
  jsxNode: ViewFlyNode<ComponentSetup> | Component
  nativeNode: NativeNode | null
  child: Atom | null
  sibling: Atom | null
  namespace: ElementNamespace
}

export type Atom = TextAtom | ElementAtom | ComponentAtom


