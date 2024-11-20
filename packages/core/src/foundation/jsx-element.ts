import { ComponentSetup, JSXNode, onPropsChanged, withAnnotation } from './component'
import { Provider } from '../di/provider'

export interface Props {
  children?: JSXNode | JSXNode[]
}

export function Fragment(props: Props) {
  return () => {
    return props.children
  }
}

export interface ContextProps extends Props {
  providers: Provider[]
}

export function Context(props: ContextProps) {
  function createContextComponent(providers: Provider[]) {
    return withAnnotation({
      providers,
    }, (childProps: Props) => {
      return () => {
        return childProps.children
      }
    })
  }

  let contextComponent = createContextComponent(props.providers)

  onPropsChanged((newProps: ContextProps, oldProps) => {
    if (newProps.providers === oldProps.providers) {
      return
    }
    contextComponent = createContextComponent(newProps.providers)
  })
  return () => {
    return jsx(contextComponent, {
      children: props.children
    })
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

