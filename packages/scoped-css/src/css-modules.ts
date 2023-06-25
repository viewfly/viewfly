import { JSXElement, ComponentSetup, Props } from '@viewfly/core'

function replaceCSSClass(template, css: Record<string, string>) {
  if (template instanceof JSXElement) {
    let { attrs, classes, children } = template.props
    const cssNames = attrs.get('css')
    attrs.delete('css')
    const scopedClasses: string[] = []
    Props.classToArray(cssNames).forEach(i => {
      const klass = css[i]
      if (klass) {
        scopedClasses.push(klass)
      }
    })
    const c = scopedClasses.join(' ')
    if (c) {
      if (classes) {
        classes += ' ' + c
      } else {
        classes = c
      }
    }
    template.props.classes = classes
    children.forEach(child => {
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
