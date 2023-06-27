import { Injector } from '@tanbo/di'

import { Component, JSXComponent, ComponentSetup } from './component'
import { makeError } from '../_utils/make-error'

const jsxErrorFn = makeError('JSX')

export type JSXChildNode = JSXElement | JSXComponent | string | number | boolean | null | undefined | JSXChildNode[]

export interface JSXProps<T = JSXChildNode | JSXChildNode[]> {
  children?: T

  [key: string]: any

  [key: symbol]: any
}

export const Fragment = function Fragment() {
  throw jsxErrorFn('Fragment does not support calling.')
}

export type Key = number | string

export function jsx<T extends JSXChildNode>(name: string, config?: JSXProps<T> | null, key?: Key): JSXElement
export function jsx<T extends JSXChildNode>(setup: ComponentSetup, config?: JSXProps<T> | null, key?: Key): JSXComponent
export function jsx<T extends JSXChildNode>(setup: string | ComponentSetup,
                                            config?: JSXProps<T> | null, key?: Key) {
  if (typeof setup === 'string') {
    return new JSXElement(setup, config, key)
  }
  return new JSXComponent(function (context: Injector) {
    return new Component(context, setup, config, key)
  })
}

export function jsxs<T extends JSXChildNode[]>(name: string, config?: JSXProps<T> | null, key?: Key): JSXElement
export function jsxs<T extends JSXChildNode[]>(setup: ComponentSetup, config?: JSXProps<T> | null, key?: Key): JSXComponent
export function jsxs<T extends JSXChildNode[]>(setup: string | ComponentSetup, config?: JSXProps<T> | null, key?: Key) {
  if (typeof setup === 'string') {
    return new JSXElement(setup, config, key)
  }
  return new JSXComponent(function (context: Injector) {
    return new Component(context, setup, config, key)
  })
}

export interface JSXTypeof {
  $$typeOf: string | ComponentSetup

  is(target: JSXTypeof): boolean
}


export interface VElementListeners {
  [listenKey: string]: <T extends Event>(ev: T) => any;
}

export class JSXText implements JSXTypeof {
  $$typeOf = '#text'

  constructor(public text: string) {
  }

  is(target: JSXTypeof) {
    return target.$$typeOf === this.$$typeOf
  }
}

export class Props {
  attrs = new Map<string, any>()
  styles = new Map<string, string | number>()
  classes = ''

  listeners: VElementListeners = {}
  children: JSXChildNode[] = []

  constructor(props?: JSXProps<JSXChildNode> | JSXProps<JSXChildNode[]> | null) {
    if (!props) {
      return
    }
    Object.keys(props).forEach(key => {
      if (key === 'children') {
        if (props.children !== null && typeof props.children !== 'undefined') {
          if (Array.isArray(props!.children)) {
            this.children = props.children
          } else {
            this.children = [props!.children]
          }
        }
        return
      }
      if (key === 'class') {
        this.classes = Props.classToString(props[key])
        return
      }
      if (key === 'style') {
        const style = props!.style || ''
        if (typeof style === 'string') {
          style.split(';').map(s => s.split(':')).forEach(v => {
            if (!v[0] || !v[1]) {
              return
            }
            this.styles.set(v[0].trim(), v[1].trim())
          })
        } else if (typeof style === 'object') {
          Object.keys(style).forEach(key => {
            this.styles.set(key, style[key])
          })
        }
        return
      }
      if (/^on[A-Z]/.test(key)) {
        const listener = props![key]
        if (typeof listener === 'function') {
          this.listeners[key.replace(/^on/, '').toLowerCase()] = listener
        } else {
          this.attrs.set(key, listener)
        }
        return
      }
      this.attrs.set(key, props![key])
    })
  }

  static classToString(config: unknown) {
    if (!config) {
      return ''
    }
    if (typeof config === 'string') {
      return config
    } else if (Array.isArray(config)) {
      return config.map(i => {
        return Props.classToString(i)
      }).join(' ')
    } else if (typeof config === 'object') {
      if (config.toString !== Object.prototype.toString && !config.toString.toString().includes('[native code]')) {
        return config.toString()
      }
      const classes: string[] = []
      for (const key in config) {
        if ({}.hasOwnProperty.call(config, key) && config[key]) {
          classes.push(key)
        }
      }
      return classes.join(' ')
    }
  }

  static classToArray(config: unknown) {
    const classes: string[] = []
    if (!config) {
      return classes
    }
    if (typeof config === 'string') {
      const items = config.match(/\S+/g)
      return items || classes
    } else if (Array.isArray(config)) {
      for (const i of config) {
        classes.push(...Props.classToArray(i))
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
}

export class JSXElement implements JSXTypeof {
  $$typeOf = this.name
  props: Props

  constructor(public name: string,
              public config?: JSXProps<any> | null,
              public key?: Key) {
    this.props = new Props(config)
  }

  is(target: JSXTypeof) {
    return target.$$typeOf === this.$$typeOf
  }
}
