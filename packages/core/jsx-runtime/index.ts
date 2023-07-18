import { jsx, jsxs, Fragment, ViewTypes } from '@viewfly/core'
import { NativeElements } from '@viewfly/platform-browser'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */

const jsxDEV = jsx

export { jsx, jsxs, Fragment, jsxDEV }


export namespace JSX {
  export interface ElementClass extends ViewTypes.ElementClass {
  }

  export interface IntrinsicElements extends NativeElements, ViewTypes.IntrinsicElements {
  }

  export interface IntrinsicAttributes extends ViewTypes.IntrinsicAttributes {
  }

  export interface ElementChildrenAttribute extends ViewTypes.ElementChildrenAttribute {
  }

  export interface IntrinsicClassAttributes<T> extends ViewTypes.IntrinsicClassAttributes<T> {
  }
}
