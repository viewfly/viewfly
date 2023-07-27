import { Key } from './jsx-element'
import { ExtractInstanceType, Ref } from './component'

export type JSXNode = JSXInternal.JSXNode

export namespace JSXInternal {
  export type ClassNames = string | Record<string, unknown> | ClassNames[]

  export interface ComponentInstance<P> {
    $render(): JSXNode

    $shouldUpdate?(currentProps: P, prevProps: P): boolean
  }

  export type JSXNode = Element | JSXInternal.ElementClass | string | number | boolean | null | undefined | JSXNode[]

  export interface Element<P = any, C extends string | ElementClass<P> = string | ElementClass<P>> {
  }

  export interface IntrinsicAttributes {
    key?: Key
    ref?: any
  }

  export interface RefAttributes<T> extends IntrinsicAttributes {
    ref?: Ref<T, ExtractInstanceType<T>> | Ref<T, ExtractInstanceType<T>>[]
  }

  export interface ElementClass<P = any> {
    (props?: P): () => (JSXNode | ComponentInstance<P>)
  }

  export interface ElementChildrenAttribute {
  }

  export interface IntrinsicElements {
  }

  export interface IntrinsicClassAttributes<T> extends RefAttributes<T> {
  }
}
