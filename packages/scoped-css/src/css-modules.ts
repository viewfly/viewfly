import { JSXNodeFactory } from '@viewfly/core'

export function withScopedCSS(cssNamespace: string | string[], render: () => JSXInternal.ViewNode): () => JSXInternal.ViewNode {
  if (!cssNamespace) {
    return render
  }
  return function () {
    const oldCreateNote = JSXNodeFactory.createNode
    const spaces = Array.isArray(cssNamespace) ? cssNamespace : [cssNamespace]

    JSXNodeFactory.createNode = function (name, props, key) {
      for (const scopedId of spaces) {
        (props as any)[scopedId] = ''
      }
      return oldCreateNote.apply(JSXNodeFactory, [name, props, key])
    } as typeof oldCreateNote
    const vDom = render()
    JSXNodeFactory.createNode = oldCreateNote
    return vDom
  }
}
