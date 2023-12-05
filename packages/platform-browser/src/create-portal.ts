import {
  getCurrentInstance,
  JSXNode,
  NativeNode,
  inject,
  NativeRenderer,
  Component,
  createRenderer,
  onPropsChanged,
  onUpdated
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
export function createPortal<T extends NativeNode>(childRender: () => JSXNode, host: T) {
  const instance = getCurrentInstance()
  const nativeRenderer = inject(NativeRenderer)
  const component = new Component(instance, () => childRender, {})
  onPropsChanged(() => {
    component.markAsDirtied()
  })
  onUpdated(() => {
    instance.$$view.atom.child = component.$$view.atom
  })
  const render = createRenderer(component, nativeRenderer)
  return function () {
    render(host)
    return null
  }
}
