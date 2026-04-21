import { ComponentSetup, JSXNode } from './component'
import { NativeNode } from './injection-tokens'

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

/**
 * 给组件的视图元素节点添加自定义属性标记
 * @param marks
 * @param setup
 * @example
 * ```tsx
 * const App = withMark('mark', function(props) {
 *   return () => {
 *     return <div>...</div>
 *   }
 * })
 * ```
 */
export function withMark<T extends ComponentSetup>(marks: string | string[], setup: T): T {
  if (!marks) {
    return setup
  }
  return function (props: any) {
    const componentRenderFn = setup(props)

    const isFn = typeof componentRenderFn === 'function'
    if (isFn) {
      return function () {
        return applyMark(marks, componentRenderFn)
      }
    }
    const oldRender = componentRenderFn.$render
    componentRenderFn.$render = function () {
      return applyMark(marks, () => {
        return oldRender.call(componentRenderFn)
      })
    }

    return componentRenderFn
  } as T
}

/**
 * 内部使用
 * @internal
 * @param mark
 * @param render
 */
export function applyMark(mark: string | string[], render: () => JSXNode) {
  const oldCreateNote = JSXNodeFactory.createNode
  const spaces = Array.isArray(mark) ? mark : [mark]

  JSXNodeFactory.createNode = function (name, props, key) {
    for (const scopedId of spaces) {
      props[scopedId] = ''
    }
    return oldCreateNote.apply(JSXNodeFactory, [name, props, key])
  } as typeof oldCreateNote
  const vDom = render()
  JSXNodeFactory.createNode = oldCreateNote
  return vDom
}

export interface PortalProps<T extends NativeNode> extends Props {
  host: T
}

/**
 * 将子节点渲染到指定节点
 * @param props
 * @example
 * ```tsx
 * function App() {
 *   const modal = document.getElementById('modal')!
 *   return () => {
 *     return (
 *       <div>
 *         <Portal host={modal}>
 *           这里的内容将渲染到 modal 节点
 *         </Portal>
 *       </div>
 *     )
 *   }
 * }
 * ```
 */
export function Portal<T extends NativeNode>(props: PortalProps<T>) {
  return {
    $portalHost: props.host,
    $render() {
      return props.children
    }
  }
}

