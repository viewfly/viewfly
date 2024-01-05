import { Component } from './component'
import { JSXInternal } from './types'
import { ListenDelegate } from './_utils'

export interface Props {
  children?: JSXInternal.JSXNode | JSXInternal.JSXNode[]

  [key: string]: any

  [key: symbol]: any
}

export function Fragment(props: Props) {
  return () => {
    return props.children
  }
}

export type Key = number | string

export function jsx(name: string, props: Props, key?: Key): JSXElement
export function jsx(setup: JSXInternal.ComponentSetup, props: Props, key?: Key): JSXComponent
export function jsx(setup: string | JSXInternal.ComponentSetup, props: Props, key?: Key) {
  if (typeof setup === 'string') {
    return JSXElement.createInstance(setup, props, key)
  }
  return JSXComponent.createInstance(setup, props, function (context: Component) {
    return new Component(context, setup, props, key)
  }, key)
}

export const jsxs = jsx

export const JSXTextTypeOf = Symbol('JSXText')

export class JSXText {
  readonly type = JSXTextTypeOf

  constructor(public readonly text: string) {
  }
}

export class JSXElement {
  static createInstance(type: string, props: Props, key?: Key) {
    return new JSXElement(type, props, key)
  }

  on?: Record<string, ListenDelegate>

  constructor(public readonly type: string,
              public readonly props: Props,
              public readonly key?: Key) {
  }
}

export class JSXComponent {
  static createInstance(type: JSXInternal.ComponentSetup,
                        props: Props,
                        factory: (parentComponent: Component) => Component,
                        key?: Key) {
    return new JSXComponent(type, props, factory, key)
  }

  constructor(public readonly type: JSXInternal.ComponentSetup,
              public readonly props: Props,
              public readonly factory: (parentComponent: Component) => Component,
              public readonly key?: Key) {
  }

  createInstance(parentComponent: Component) {
    return this.factory(parentComponent)
  }
}

