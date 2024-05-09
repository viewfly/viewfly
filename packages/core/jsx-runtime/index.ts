import { jsx, jsxs, Fragment } from '@viewfly/core'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */

const jsxDEV = jsx

export { jsx, jsxs, Fragment, jsxDEV }


export namespace JSX {
  export type Element = JSXInternal.Element

  export interface ElementClass extends JSXInternal.ElementClass {
  }

  export interface IntrinsicElements extends JSXInternal.IntrinsicElements {
  }

  export interface IntrinsicAttributes extends JSXInternal.IntrinsicAttributes {
  }

  export interface ElementChildrenAttribute extends JSXInternal.ElementChildrenAttribute {
  }

  export interface IntrinsicClassAttributes<T> extends JSXInternal.IntrinsicClassAttributes<T> {
  }
}
