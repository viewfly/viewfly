import { jsx, jsxs, Fragment, JSX as ViewflyJSX } from '@viewfly/core'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */

const jsxDEV = jsx

export { jsx, jsxs, Fragment, jsxDEV }


export namespace JSX {
  export type ElementType = ViewflyJSX.ElementType

  export interface Element extends ViewflyJSX.Element {
  }

  export interface ElementClass extends ViewflyJSX.ElementClass {
  }

  export interface IntrinsicElements extends ViewflyJSX.IntrinsicElements {
  }

  export interface IntrinsicAttributes extends ViewflyJSX.IntrinsicAttributes {
  }

  export interface ElementChildrenAttribute extends ViewflyJSX.ElementChildrenAttribute {
  }

  export interface IntrinsicClassAttributes<T> extends ViewflyJSX.IntrinsicClassAttributes<T> {
  }
}
