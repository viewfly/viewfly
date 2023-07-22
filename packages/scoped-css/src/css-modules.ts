import { JSXElement, JSXComponent, JSXInternal } from '@viewfly/core'

function replaceCSSClass(template: JSXInternal.JSXChildNode, cssNamespace: string | string[]) {
  if (template instanceof JSXElement || template instanceof JSXComponent) {
    const children = template.props.children
    const nameSpaces = Array.isArray(cssNamespace) ? cssNamespace : [cssNamespace]
    nameSpaces.forEach(i => {
      if (typeof i === 'string' && i) {
        template.props[i] = ''
      }
    })
    if (Array.isArray(children)) {
      children.forEach(child => {
        replaceCSSClass(child, cssNamespace)
      })
    } else {
      replaceCSSClass(children, cssNamespace)
    }
  }
  return template
}

export function withScopedCSS(cssNamespace: string | string[], render: () => JSXInternal.Element): () => JSXInternal.JSXChildNode {
  return function scopedCSS() {
    return replaceCSSClass(render(), cssNamespace)
  }
}
