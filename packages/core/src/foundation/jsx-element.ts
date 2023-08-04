import { Component } from './component'
import { JSXInternal } from './types'
import { ComponentView, ListenDelegate } from './_utils'
import { JSX } from '../../jsx-runtime';

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
    return JSXElement.create(setup, props, key)
  }
  return new JSXComponent(setup, props, function (context: Component, jsxNode: JSXComponent) {
    return new Component(context, jsxNode, props, key)
  }, key)
}

export const jsxs = jsx

export interface JSXTypeof {
  $$typeOf: string | JSXInternal.ComponentSetup

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
  static create(name: string, props: Props, key?: Key) {
    return new JSXElement(name, props, key)
  }

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

export class JSXComponent implements JSXTypeof {
  $$typeOf = this.type
  $$view!: ComponentView

  parentComponent: JSXComponent | null = null
  instance!: Component
  changedSubComponents = new Set<JSXComponent>()

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  protected _dirty = true
  protected _changed = true

  constructor(public type: JSXInternal.ComponentSetup,
              public readonly props: Props,
              private factory: (parentComponent: Component, jsxNode: JSXComponent) => Component,
              public readonly key?: Key) {
  }

  markAsDirtied() {
    this._dirty = true
    this.markAsChanged()
  }

  markAsChanged(changedComponent?: JSXComponent) {
    if (changedComponent) {
      this.changedSubComponents.add(changedComponent)
    }
    if (this._changed) {
      return
    }
    this._changed = true
    this.parentComponent!.markAsChanged(this)
  }

  reset() {
    this.changedSubComponents.clear()
    this.instance.rendered()
    this._dirty = this._changed = false
  }

  is(target: JSXTypeof) {
    return target.$$typeOf === this.$$typeOf
  }

  createInstance(injector: Component) {
    this.parentComponent = injector.jsxNode
    this.instance = this.factory(injector, this)
    return this.instance
  }
}

