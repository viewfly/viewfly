export interface Props {
  children?: JSXInternal.ViewNode | JSXInternal.ViewNode[]
}

export function Fragment(props: Props) {
  return () => {
    return props.children
  }
}

export type Key = number | string

export function jsx(type: string | JSXInternal.ComponentSetup, props: Props & Record<string, any>, key?: Key): JSXNode {
  return JSXNodeFactory.createNode(type, props, key)
}

export const jsxs = jsx

export interface JSXNode<T = string | JSXInternal.ComponentSetup> {
  type: T
  props: Props & Record<string, any>
  key?: Key
}

export const JSXNodeFactory = {
  createNode<T = string | JSXInternal.ComponentSetup>(type: T, props: Props & Record<string, any>, key?: Key): JSXNode<T> {
    return {
      type,
      props,
      key
    }
  }
}

