import type { JSXElement, Ref, jsx, jsxs, Fragment } from '@viewfly/core'
import type { NativeElements } from '@viewfly/platform-browser'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */

export { jsx, jsxs, Fragment }

export namespace JSX {
  export interface Element extends JSXElement {
  }

  export interface IntrinsicElements extends NativeElements {
  }

  export interface IntrinsicAttributes {
    ref?: Ref<any>
  }
}
