import { Key, Ref, JSXComponent, ExtractInstanceType } from '@viewfly/core'

export namespace ViewTypes {
  export type ClassNames = string | Record<string, unknown> | Array<string | Record<string, unknown>>

  export interface IntrinsicAttributes {
    key?: Key
    ref?: any
  }

  export interface RefAttributes<T> extends IntrinsicAttributes {
    ref?: Ref<T, ExtractInstanceType<T>> | Ref<T, ExtractInstanceType<T>>[]
  }

  export interface ElementClass extends JSXComponent {
  }

  export interface ElementChildrenAttribute {
  }

  export interface IntrinsicElements {
  }

  export interface IntrinsicClassAttributes<T> extends IntrinsicAttributes {
  }
}
