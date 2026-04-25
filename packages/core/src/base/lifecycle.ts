import { getSetupContext } from './component'

export interface LifeCycleCallback {
  (): void | (() => void)
}

/**
 * 当组件挂载后调用回调函数
 * @param callback 回调函数
 * @returns 一个函数，用于停止监听
 * @example
 * ```tsx
 * function App() {
 *   onMounted(() => {
 *     console.log('App mounted!')
 *     return () => {
 *       console.log('destroy prev mount!')
 *     }
 *   })
 *   return () => <div>...</div>
 * }
 * ```
 */
export function onMounted(callback: LifeCycleCallback) {
  const component = getSetupContext()
  if (!component.mountCallbacks) {
    component.mountCallbacks = []
  }
  component.mountCallbacks.push(callback)
}

/**
 * 当组件视图更新后调用回调函数
 * @param callback 回调函数
 * @returns 一个函数，用于停止监听
 * @example
 * ```tsx
 * function App() {
 *   onUpdated(() => {
 *     console.log('App updated!')
 *     return () => {
 *       console.log('destroy prev update!')
 *     }
 *   })
 *   return () => <div>...</div>
 * }
 * ```
 */
export function onUpdated(callback: LifeCycleCallback) {
  const component = getSetupContext()
  if (!component.updatedCallbacks) {
    component.updatedCallbacks = []
  }
  component.updatedCallbacks.push(callback)
  return () => {
    const index = component.updatedCallbacks!.indexOf(callback)
    if (index > -1) {
      component.updatedCallbacks!.splice(index, 1)
    }
  }
}

/**
 * 当组件销毁后调用回调函数
 * @param callback 回调函数
 * @returns 一个函数，用于停止监听
 * @example
 * ```tsx
 * function App() {
 *   onUnmounted(() => {
 *     console.log('App unmounted!')
 *   })
 *   return () => <div>...</div>
 * }
 * ```
 */
export function onUnmounted(callback: () => void) {
  const component = getSetupContext()
  if (!component.unmountedCallbacks) {
    component.unmountedCallbacks = []
  }
  component.unmountedCallbacks.push(callback)
}
