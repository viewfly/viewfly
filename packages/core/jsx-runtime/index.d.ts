import type { JSXComponent, jsx, jsxs, Fragment } from '@viewfly/core'
import type { NativeElements } from '@viewfly/platform-browser'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */

export { jsx, jsxs, Fragment }

export namespace JSX {
  export interface ElementClass extends JSXComponent {
  }

  export interface IntrinsicElements extends NativeElements {
  }
}
