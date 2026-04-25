import { Key, ViewFlyNode } from './jsx-element'
import { ComponentInstance, ComponentSetup } from './component'
import { DynamicRef, ExtractInstanceType, Ref } from './ref'

export type RefProp<T> = Ref<ExtractInstanceType<T> | null> | DynamicRef<ExtractInstanceType<T>>

// eslint-disable-next-line
export namespace JSX {
  export type ElementType =
    | keyof IntrinsicElements
    | ComponentSetup

  export interface Element extends ViewFlyNode {
  }

  export interface KeyedAttributes {
    key?: Key
  }

  export interface IntrinsicAttributes extends KeyedAttributes {
    ref?: any
  }

  export interface ElementClass extends ComponentInstance {
  }

  export interface ElementAttributesProperty {
    props: {}
  }

  export interface ElementChildrenAttribute {
    children: {}
  }

  export interface IntrinsicElements {
    [name: string]: any
  }

  export interface IntrinsicClassAttributes<T> {
    ref?: RefProp<T>
  }
}
