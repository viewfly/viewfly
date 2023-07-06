import { Injector } from '@tanbo/di'

import { Component, JSXComponent, ComponentSetup } from './component'

export type JSXChildNode = JSXElement | JSXComponent | string | number | boolean | null | undefined | JSXChildNode[]

export interface Props<T = JSXChildNode | JSXChildNode[]> {
  children?: T

  [key: string]: any

  [key: symbol]: any
}

export const Fragment = function Fragment(props: Props) {
  return () => {
    return props.children
  }
}

export type Key = number | string

export function jsx<T extends JSXChildNode>(name: string, config: Props<T>, key?: Key): JSXElement
export function jsx<T extends JSXChildNode>(setup: ComponentSetup, config: Props<T>, key?: Key): JSXComponent
export function jsx<T extends JSXChildNode>(setup: string | ComponentSetup,
                                            config: Props<T>, key?: Key) {
  if (typeof setup === 'string') {
    return new JSXElement(setup, config, key)
  }
  return new JSXComponent(function (context: Injector) {
    return new Component(context, setup, config, key)
  })
}

export function jsxs<T extends JSXChildNode[]>(name: string, config: Props<T>, key?: Key): JSXElement
export function jsxs<T extends JSXChildNode[]>(setup: ComponentSetup, config: Props<T>, key?: Key): JSXComponent
export function jsxs<T extends JSXChildNode[]>(setup: string | ComponentSetup, config: Props<T>, key?: Key) {
  if (typeof setup === 'string') {
    return new JSXElement(setup, config, key)
  }
  return new JSXComponent(function (context: Injector) {
    return new Component(context, setup, config, key)
  })
}

export interface JSXTypeof {
  $$typeOf: string | ComponentSetup

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

export class JSXElement implements JSXTypeof {
  $$typeOf = this.name

  constructor(public name: string,
              public props: Props<any>,
              public key?: Key) {
  }

  is(target: JSXTypeof) {
    return target.$$typeOf === this.$$typeOf
  }
}
