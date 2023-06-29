import { JSXElement, ComponentSetup } from '@viewfly/core'

function cssNamesToArray(config: unknown) {
  const classes: string[] = []
  if (!config) {
    return classes
  }
  if (typeof config === 'string') {
    const items = config.match(/\S+/g)
    return items || classes
  } else if (Array.isArray(config)) {
    for (const i of config) {
      classes.push(...cssNamesToArray(i))
    }
  } else if (typeof config === 'object') {
    if (config.toString !== Object.prototype.toString && !config.toString.toString().includes('[native code]')) {
      classes.push(config.toString())
      return classes
    }
    for (const key in config) {
      if ({}.hasOwnProperty.call(config, key) && config[key]) {
        classes.push(key)
      }
    }
  }
  return classes
}

function replaceCSSClass(template, cssMap: Record<string, string>) {
  if (template instanceof JSXElement) {
    let { class: className, children } = template.props
    const css = template.props.css
    Reflect.deleteProperty(template.props, 'css')
    const scopedClasses: string[] = []
    cssNamesToArray(css).forEach(i => {
      const klass = cssMap[i]
      if (klass) {
        scopedClasses.push(klass)
      }
    })
    const c = scopedClasses.join(' ')
    if (c) {
      if (className) {
        className += ' ' + c
      } else {
        className = c
      }
    }
    if (className) {
      template.props.class = className
    }
    if (Array.isArray(children)) {
      children.forEach(child => {
        replaceCSSClass(child, cssMap)
      })
    } else {
      replaceCSSClass(children, cssMap)
    }
  }
}

export function scopedCSS<T extends ComponentSetup>(css: Record<string, string>, factory: T): T {
  return function (props: any) {
    const componentRender = factory(props)
    return function () {
      const template = componentRender()
      replaceCSSClass(template, css)
      return template
    }
  } as T
}
