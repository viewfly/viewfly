import { JSXElement, ComponentFactory } from '@viewfly/core'

function replaceCSSClass(template, css: any) {
  if (template instanceof JSXElement) {
    const cssNames = template.props.attrs.get('css')
    if (typeof cssNames !== 'string') {
      return
    }
    template.props.attrs.delete('css')
    const classes = template.props.classes
    cssNames.split(' ').map(i => i.trim()).filter(i => i).forEach(i => {
      const klass = css[i]
      if (klass) {
        classes.add(klass)
      }
    })
    template.props.children.forEach(child => {
      replaceCSSClass(child, css)
    })
  }
}

export function scopedCss<T extends ComponentFactory>(css: any, factory: T): T {
  css = css || {}
  return function (props: any) {
    const componentRender = factory(props)
    return function () {
      const template = componentRender()
      replaceCSSClass(template, css)
      return template
    }
  } as T
}
