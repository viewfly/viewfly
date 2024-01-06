import { JSXComponent, JSXElement, JSXText } from './jsx-element'
import { NativeNode } from './injection-tokens'
import { Component } from './component'

export interface ListenDelegate {
  delegate: () => any
  listenFn: ((...args: any[]) => any) | void
}

export interface ObjectChanges {
  remove: [string, any][]
  add: [string, any][]
  replace: [string, any, any][]
}

export const refKey = 'ref'

export function getObjectChanges(newProps: Record<string, any>, oldProps: Record<string, any>) {
  const changes: ObjectChanges = {
    remove: [],
    add: [],
    replace: []
  }
  for (const key in newProps) {
    const leftValue = newProps[key]
    const rightValue = oldProps[key]
    if (Reflect.has(oldProps, key)) {
      if (leftValue !== rightValue) {
        changes.replace.push([key, leftValue, rightValue])
      }
      continue
    }
    changes.add.push([key, leftValue])
  }

  for (const key in oldProps) {
    if (!Reflect.has(newProps, key)) {
      changes.remove.push([key, oldProps[key]])
    }
  }
  return changes
}

export interface ArrayChanges<T> {
  remove: T[]
  add: T[]
}

export function getArrayChanges<T>(left: T[], right: T[]) {
  const changes: ArrayChanges<T> = {
    add: [],
    remove: []
  }

  for (const i of left) {
    if (!right.includes(i)) {
      changes.remove.push(i)
    }
  }
  for (const i of right) {
    if (!left.includes(i)) {
      changes.add.push(i)
    }
  }
  return changes
}

export function classToString(config: unknown) {
  if (!config) {
    return ''
  }
  if (typeof config === 'string') {
    return config
  } else if (Array.isArray(config)) {
    const classes: string[] = []
    for (const i of config) {
      const v = classToString(i)
      if (v) {
        classes.push(v)
      }
    }
    return classes.join(' ')
  } else if (typeof config === 'object') {
    if (config.toString !== Object.prototype.toString && !config.toString.toString().includes('[native code]')) {
      return config.toString()
    }
    const classes: string[] = []
    for (const key in config) {
      if ({}.hasOwnProperty.call(config, key) && config[key]) {
        classes.push(key)
      }
    }
    return classes.join(' ')
  }
  return ''
}

export function styleToObject(style: string | Record<string, any>) {
  if (typeof style !== 'string') {
    return style
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

export interface Atom {
  jsxNode: JSXElement | JSXText | JSXComponent | Component
  // parent: Atom | null
  nativeNode: NativeNode | null
  child: Atom | null
  sibling: Atom | null
  isSvg: boolean
}

export interface ComponentView {
  atom: Atom
  host: NativeNode,
  isParent: boolean,
  rootHost: NativeNode
}


