import { Key } from './jsx-element'
import { ExtractInstanceType, DynamicRef } from './component'
import { Scope } from '../di/injectable'

export type JSXNode = JSXInternal.JSXNode

/* eslint-disable @typescript-eslint/no-namespace*/
export namespace JSXInternal {
  export type ClassNames = string | Record<string, unknown> | false | null | undefined | ClassNames[]

  export interface ComponentInstance<P> {
    $render(): JSXNode

    $useMemo?(currentProps: P, prevProps: P): boolean
  }

  export type JSXNode =
    Element
    | JSXInternal.ElementClass
    | string
    | number
    | boolean
    | null
    | undefined
    | JSXNode[]

  export interface ComponentSetup<P = any> {
    (props: P): (() => Element) | ComponentInstance<P>
    scope?: Scope
  }

  export type Element<
    P = any,
    C extends string | ComponentSetup<P> = string | ComponentSetup<P>
  > = C extends string ? IntrinsicElements[C] : (() => Element) | ComponentInstance<P>

  export interface IntrinsicAttributes {
    key?: Key
    ref?: any
  }

  export interface RefAttributes<T> extends IntrinsicAttributes {
    ref?: DynamicRef<ExtractInstanceType<T>> | DynamicRef<ExtractInstanceType<T>>[]
  }

  export interface ElementClass<P = any> extends ComponentInstance<P> {
  }

  export interface ElementChildrenAttribute {
  }

  export interface IntrinsicElements {
    [name: string]: any
  }

  export interface IntrinsicClassAttributes<T> {
    ref?: DynamicRef<T>
  }
}
