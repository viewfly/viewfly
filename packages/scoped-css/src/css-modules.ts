import { JSXElement, JSXInternal } from '@viewfly/core'

export function withScopedCSS(cssNamespace: string | string[], render: () => JSXInternal.JSXNode): () => JSXInternal.JSXNode {
  if (!cssNamespace) {
    return render
  }
  return function () {
    const oldCreate = JSXElement.createInstance
    const spaces = Array.isArray(cssNamespace) ? cssNamespace : [cssNamespace]

    JSXElement.createInstance = function (name, props, key) {
      for (const scopedId of spaces) {
        props[scopedId] = ''
      }
      return oldCreate.apply(JSXElement, [name, props, key])
    }
    const vDom = render()
    JSXElement.createInstance = oldCreate
    return vDom
  }
}
