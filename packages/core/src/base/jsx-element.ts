import { ComponentSetup, JSXNode } from './component'

export interface Props {
  children?: JSXNode | JSXNode[]
}

export function Fragment(props: Props) {
  return () => {
    return props.children
  }
}

export type Key = number | string

export function jsx(type: string | ComponentSetup, props: Props & Record<string, any>, key?: Key): ViewFlyNode {
  return JSXNodeFactory.createNode(type, props, key)
}

export const jsxs = jsx

export interface ViewFlyNode<T = string | ComponentSetup> {
  type: T
  props: Props & Record<string, any>
  key?: Key
}

export const JSXNodeFactory = {
  createNode<T = string | ComponentSetup>(type: T, props: Props & Record<string, any>, key?: Key): ViewFlyNode<T> {
    return {
      type,
      props,
      key
    }
  }
}

