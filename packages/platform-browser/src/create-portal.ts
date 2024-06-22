import {
  ViewFlyNode,
  NativeNode,
} from '@viewfly/core'

/**
 * 用于创建脱离当前 DOM 树的子节点，常用于弹窗等
 * @param childRender
 * @param host
 * @example
 * ```tsx
 * function App() {
 *   const number = createSignal(0)
 *
 *   setInterval(() => {
 *     number.set(number() + 1)
 *   }, 1000)
 *
 *   const ModalPortal = function (props) {
 *     return createPortal(() => {
 *       return <div class="modal">parent data is {props.text}</div>
 *     }, document.body)
 *   }
 *   return () => {
 *     return (
 *       <div>
 *         <div>data is {number()}</div>
 *         <ModalPortal text={number()}/>
 *       </div>
 *     )
 *   }
 * }
 * ```
 */
export function createPortal<T extends NativeNode>(childRender: () => ViewFlyNode, host: T) {
  return {
    $portalHost: host,
    $render: childRender
  }
}
