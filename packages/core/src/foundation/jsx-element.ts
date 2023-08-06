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
  return new JSXComponent(setup, props, function (context: Component) {
    return new Component(context, setup, props, key)
  }, key)
}

export const jsxs = jsx

const JSXTextTypeOf = Symbol('JSXText')

export interface JSXTypeof<T extends string | Symbol | JSXInternal.ComponentSetup = string | Symbol | JSXInternal.ComponentSetup> {
  $$typeOf: T
}

export class JSXText implements JSXTypeof<Symbol> {
  $$typeOf = JSXTextTypeOf

  constructor(public text: string) {
  }
}

export class JSXElement implements JSXTypeof<string> {
  $$typeOf = this.type

  static createInstance(type: string, props: Props, key?: Key) {
    return new JSXElement(type, props, key)
  }

  on?: Record<string, ListenDelegate>

  constructor(public type: string,
              public props: Props,
              public key?: Key) {
  }
}

export class JSXComponent implements JSXTypeof<JSXInternal.ComponentSetup> {
  $$typeOf = this.type

  constructor(public type: JSXInternal.ComponentSetup,
              public props: Props,
              public factory: (parentComponent: Component) => Component,
              public key?: Key) {
  }

  createInstance(parentComponent: Component) {
    return this.factory(parentComponent)
  }
}

