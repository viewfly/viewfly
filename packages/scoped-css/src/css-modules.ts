import { JSXElement, JSXComponent, JSXInternal } from '@viewfly/core'

declare module '@viewfly/core' {
  namespace JSXInternal {
    interface Attributes {
      css?: JSXInternal.ClassNames
    }
  }
}

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

function replaceCSSClass(template: JSXInternal.JSXChildNode, cssMap: Record<string, string>) {
  if (template instanceof JSXElement || template instanceof JSXComponent) {
    let { class: className, children } = template.props
    const css = template.props.css
    Reflect.deleteProperty(template.props, 'css')
    const c = getClassNames(css, cssMap)
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
  return template
}

export function getClassNames(config: JSXInternal.ClassNames, cssRecord: Record<string, string>) {
  const scopedClasses: string[] = []
  cssNamesToArray(config).forEach(i => {
    const klass = cssRecord[i]
    if (klass) {
      scopedClasses.push(klass)
    }
  })
  return scopedClasses.join(' ')
}

export function withScopedCSS(css: Record<string, string>, render: () => JSXInternal.Element): () => JSXInternal.JSXChildNode {
  return function scopedCSS() {
    return replaceCSSClass(render(), css)
  }
}
