import { Key } from './jsx-element'
import { ExtractInstanceType, DynamicRef, ComponentInstance, ComponentSetup } from './component'

// eslint-disable-next-line
export namespace JSX {
  export type Element<P = any> = IntrinsicElements[string] | ComponentSetup<P>

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
