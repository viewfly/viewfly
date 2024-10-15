import { Key, ViewFlyNode } from './jsx-element'
import { ExtractInstanceType, DynamicRef, ComponentInstance, ComponentSetup } from './component'

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

    [key: string]: any
  }

  export interface RefAttributes<T> extends KeyedAttributes {
    ref?: DynamicRef<ExtractInstanceType<T>> | DynamicRef<ExtractInstanceType<T>>[]
  }

  export interface ElementClass<P = any> extends ComponentInstance<P> {
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
    ref?: DynamicRef<T>
  }
}
