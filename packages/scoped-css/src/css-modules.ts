import { JSXElement, ComponentSetup, Props } from '@viewfly/core'

function replaceCSSClass(template, css: Record<string, string>) {
  if (template instanceof JSXElement) {
    const cssNames = template.props.attrs.get('css')
    if (typeof cssNames !== 'string') {
      return
    }
    template.props.attrs.delete('css')
    const classes = template.props.classes
    Props.classToArray(cssNames).forEach(i => {
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

export function scopedCss<T extends ComponentSetup>(css: Record<string, string>, factory: T): T {
  return function (props: any) {
    const componentRender = factory(props)
    return function () {
      const template = componentRender()
      replaceCSSClass(template, css)
      return template
    }
  } as T
}
