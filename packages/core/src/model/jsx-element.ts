import { Component, ComponentFactory } from './component'

export type JSXChildNode = JSXElement | Component | string | number | boolean | null | undefined

export interface JSXConfig<T> {
  children?: T

  [key: string]: any
}

export const Fragment = function Fragment(props: Props | null) {
  return () => new JSXFragment(props)
}

export class JSXFragment {
  constructor(public props: Props | null) {
  }
}

export function jsx<T extends JSXChildNode>(name: string, config: JSXConfig<T> | null): JSXElement
export function jsx<T extends JSXChildNode>(factory: ComponentFactory, config: JSXConfig<T> | null): Component
export function jsx<T extends JSXChildNode>(factory: string | ComponentFactory,
                                            config: JSXConfig<T> | null) {
  if (typeof factory === 'string') {
    return new JSXElement(factory, config)
  }
  return new Component(factory, config)
}

export function jsxs<T extends JSXChildNode[]>(name: string, config: JSXConfig<T> | null): JSXElement
export function jsxs<T extends JSXChildNode[]>(factory: ComponentFactory, config: JSXConfig<T> | null): Component
export function jsxs<T extends JSXChildNode[]>(factory: string | ComponentFactory, config: JSXConfig<T> | null) {
  if (typeof factory === 'string') {
    return new JSXElement(factory, config)
  }
  return new Component(factory, config)
}


export interface VElementListeners {
  [listenKey: string]: <T extends Event>(ev: T) => any;
}

export class JSXText {
  constructor(public text: string) {
  }
}

export type VNode = JSXElement | Component | JSXText

function flatChildren(jsxNodes: JSXChildNode[] | JSXChildNode[][]) {
  const children: VNode[] = []
  for (const node of jsxNodes) {
    if (node instanceof JSXElement || node instanceof Component) {
      children.push(node)
    } else if (typeof node === 'string' && node.length) {
      children.push(new JSXText(node))
    } else if (Array.isArray(node)) {
      children.push(...flatChildren(node))
    } else if (node !== null && typeof node !== 'undefined') {
      children.push(new JSXText(String(node)))
    }
  }
  return children
}

export class Props {
  attrs = new Map<string, any>()
  styles = new Map<string, string | number>()
  classes = new Set<string>()

  listeners: VElementListeners = {}
  children: VNode[] = []

  constructor(props: JSXConfig<JSXChildNode> | JSXConfig<JSXChildNode[]> | null) {
    if (!props) {
      return
    }
    Object.keys(props).forEach(key => {
      if (key === 'children') {
        if (props.children !== null && typeof props.children !== 'undefined') {
          if (Array.isArray(props!.children)) {
            this.children = flatChildren(props!.children)
          } else {
            this.children = flatChildren([props!.children])
          }
        }
        return
      }
      if (key === 'class') {
        const className = (props!.class || '').trim();
        (this as any).classes = new Set<string>(className ? className.split(/\s+/g) : [])
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
}

export class JSXElement {
  props: Props

  constructor(public name: string,
              public config: JSXConfig<any> | null) {
    this.props = new Props(config)
  }
}
