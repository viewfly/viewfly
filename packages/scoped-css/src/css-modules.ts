import { Component, JSXComponent, JSXElement, JSXInternal, Key, Props } from '@viewfly/core'

export function withScopedCSS(cssNamespace: string | string[], render: () => JSXInternal.JSXNode): () => JSXInternal.JSXNode {
  if (!cssNamespace) {
    return render
  }
  return function () {
    const oldCreateElement = JSXElement.createInstance
    const oldCreateComponent = JSXComponent.createInstance
    const spaces = Array.isArray(cssNamespace) ? cssNamespace : [cssNamespace]

    JSXElement.createInstance = function (name, props, key) {
      for (const scopedId of spaces) {
        props[scopedId] = ''
      }
      return oldCreateElement.apply(JSXElement, [name, props, key])
    }
    JSXComponent.createInstance = function (type: JSXInternal.ComponentSetup,
                                            props: Props,
                                            factory: (parentComponent: Component) => Component,
                                            key?: Key) {
      for (const scopedId of spaces) {
        props[scopedId] = ''
      }

      return oldCreateComponent.apply(JSXComponent, [type, props, factory, key])
    }
    const vDom = render()
    JSXElement.createInstance = oldCreateElement
    JSXComponent.createInstance = oldCreateComponent
    return vDom
  }
}
