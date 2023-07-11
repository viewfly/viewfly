import { Key, Ref, JSXComponent } from '@viewfly/core'

export namespace ViewTypes {
  export type ClassNames = string | Record<string, unknown> | Array<string | Record<string, unknown>>

  export interface IntrinsicAttributes {
    key?: Key
  }

  export interface RefAttributes<T extends object> extends IntrinsicAttributes {
    ref?: Ref<T> | Ref<T>[]
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
