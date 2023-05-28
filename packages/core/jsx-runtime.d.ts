import { jsx, jsxs, Fragment, JSXElement } from '@viewfly/core'

export {
  jsxs,
  jsx,
  Fragment
}

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: JSXElement
  }

  interface Element extends JSXElement {
  }
}
