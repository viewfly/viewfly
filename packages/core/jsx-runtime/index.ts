import { jsx, jsxs, Fragment } from '@viewfly/core'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */

const jsxDEV = jsx

export { jsx, jsxs, Fragment, jsxDEV }


export namespace JSX {
  type Element = JSXInternal.Element

  interface ElementClass extends JSXInternal.ElementClass {
  }

  interface IntrinsicElements extends JSXInternal.IntrinsicElements {
  }

  interface IntrinsicAttributes extends JSXInternal.IntrinsicAttributes {
  }

  interface ElementChildrenAttribute extends JSXInternal.ElementChildrenAttribute {
  }

  interface IntrinsicClassAttributes<T> extends JSXInternal.IntrinsicClassAttributes<T> {
  }
}
