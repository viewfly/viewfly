import { Key, Ref } from '@viewfly/core'

export namespace JSX {
  export type ClassNames = string | Record<string, unknown> | Array<string | Record<string, unknown>>

  export interface Attributes<T extends object> {
    ref?: Ref<T> | Ref<T>[]
    key?: Key
  }

  export interface ElementClass {
  }

  export interface IntrinsicElements {
  }

  export interface IntrinsicAttributes {
  }
}
