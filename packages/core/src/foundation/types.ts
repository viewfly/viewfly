import { Key } from './jsx-element'
import { ExtractInstanceType, DynamicRef } from './component'
import { Scope } from '../di/injectable'
import { NativeNode } from './injection-tokens'

export type ViewNode = JSXInternal.ViewNode

/* eslint-disable @typescript-eslint/no-namespace*/
export namespace JSXInternal {
  export type ClassNames = string | Record<string, unknown> | false | null | undefined | ClassNames[]

  export interface ComponentInstance<P> {
    $portalHost?: NativeNode

    $render(): ViewNode

    $useMemo?(currentProps: P, prevProps: P): boolean
  }

  export type ViewNode =
    Element
    | JSXInternal.ElementClass
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ViewNode>

  export interface ComponentSetup<P = any> {
    (props: P): (() => ViewNode) | ComponentInstance<P>

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
