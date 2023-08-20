import { Key } from './jsx-element'
import { ExtractInstanceType, Ref } from './component'

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

  export type ComponentSetup<P = any> = (props: P) => (() => Element) | ComponentInstance<P>

  export type Element<
    P = any,
    C extends string | ComponentSetup<P> = string | ComponentSetup<P>
  > = C extends string ? IntrinsicElements[C] : (() => Element) | ComponentInstance<P>

  export interface IntrinsicAttributes {
    key?: Key
    ref?: any
  }

  export interface RefAttributes<T> extends IntrinsicAttributes {
    ref?: Ref<ExtractInstanceType<T>> | Ref<ExtractInstanceType<T>>[]
  }

  export interface ElementClass<P = any> extends ComponentInstance<P> {
  }

  export interface ElementChildrenAttribute {
  }

  export interface IntrinsicElements {
    [name: string]: any
  }

  export interface IntrinsicClassAttributes<T> {
    ref?: Ref<T>
  }
}
