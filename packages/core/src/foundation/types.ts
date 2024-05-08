import { Key } from './jsx-element'
import { ExtractInstanceType, DynamicRef } from './component'
import { Scope } from '../di/injectable'
import { NativeNode } from './injection-tokens'
import { Provider } from '../di/provider'

export type ViewNode = JSXInternal.ViewNode

declare global {
  /* eslint-disable @typescript-eslint/no-namespace*/
  namespace JSXInternal {
    type ClassNames = string | Record<string, unknown> | false | null | undefined | ClassNames[]

    interface ComponentInstance<P> {
      $portalHost?: NativeNode

      $render(): ViewNode

      $useMemo?(currentProps: P, prevProps: P): boolean
    }

    type ViewNode =
      Element
      | JSXInternal.ElementClass
      | string
      | number
      | boolean
      | null
      | undefined
      | Iterable<ViewNode>

    interface ComponentAnnotation {
      scope?: Scope
      providers?: Provider[]
    }

    interface ComponentSetup<P = any> {
      (props: P): (() => ViewNode) | ComponentInstance<P>

      annotation?: ComponentAnnotation
    }

    type Element<
      P = any,
      C extends string | ComponentSetup<P> = string | ComponentSetup<P>
    > = C extends string ? IntrinsicElements[C] : (() => Element) | ComponentInstance<P>

    interface IntrinsicAttributes {
      key?: Key
      ref?: any
    }

    interface RefAttributes<T> extends IntrinsicAttributes {
      ref?: DynamicRef<ExtractInstanceType<T>> | DynamicRef<ExtractInstanceType<T>>[]
    }

    interface ElementClass<P = any> extends ComponentInstance<P> {
    }

    interface ElementChildrenAttribute {
    }

    interface IntrinsicElements {
      [name: string]: any
    }

    interface IntrinsicClassAttributes<T> {
      ref?: DynamicRef<T>
    }
  }
}
