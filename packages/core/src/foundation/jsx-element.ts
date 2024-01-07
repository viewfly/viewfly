import { JSXInternal } from './types'
import { ListenDelegate } from './_utils'

export interface Props {
  children?: JSXInternal.JSXNode | JSXInternal.JSXNode[]

  [key: string]: any

  [key: symbol]: any
}

export function Fragment(props: Props) {
  return () => {
    return props.children
  }
}

export type Key = number | string

export function jsx(type: string | JSXInternal.ComponentSetup, props: Props, key?: Key): JSXNode {
  return JSXNodeFactory.createNode(type, props, key)
}

export const jsxs = jsx

export interface JSXNode<T = string | JSXInternal.ComponentSetup> {
  type: T
  props: Props
  key?: Key
  on?: Record<string, ListenDelegate>
}

export const JSXNodeFactory = {
  createNode<T = string | JSXInternal.ComponentSetup>(type: T, props: Props, key?: Key): JSXNode<T> {
    return {
      type,
      props,
      key
    }
  }
}

