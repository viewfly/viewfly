import { Injector } from '@tanbo/di'

import { Component, JSXComponent } from './component'
import { JSXInternal } from './types'

export interface Props {
  children?: JSXInternal.JSXChildNode | JSXInternal.JSXChildNode[]

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
export function jsx(setup: JSXInternal.ElementClass, props: Props, key?: Key): JSXComponent
export function jsx(setup: string | JSXInternal.ElementClass, props: Props, key?: Key) {
  if (typeof setup === 'string') {
    return new JSXElement(setup, props, key)
  }
  return new JSXComponent(props, function (context: Injector, props) {
    return new Component(context, setup, props, key)
  })
}

export const jsxs = jsx

export interface JSXTypeof {
  $$typeOf: string | JSXInternal.ElementClass

  is(target: JSXTypeof): boolean
}

export class JSXText implements JSXTypeof {
  $$typeOf = '#text'

  constructor(public text: string) {
  }

  is(target: JSXTypeof) {
    return target.$$typeOf === this.$$typeOf
  }
}

export interface ListenDelegate {
  delegate: () => any
  listenFn: ((...args: any[]) => any) | void
}

export class JSXElement implements JSXTypeof {
  $$typeOf = this.type

  on?: Record<string, ListenDelegate>

  constructor(public type: string,
              public props: Props,
              public key?: Key) {
  }

  is(target: JSXTypeof) {
    return target.$$typeOf === this.$$typeOf
  }
}
