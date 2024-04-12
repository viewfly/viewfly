import { getSetupContext } from './component'

export interface LifeCycleCallback {
  (): void | (() => void)
}

/**
 * 当组件第一次渲染完成时触发
 * @param callback
 * ```tsx
 * function App() {
 *   onMount(() => {
 *     console.log('App mounted!')
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
 * 当组件视图更新后调用
 * @param callback
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
 * 当组件销毁时调用回调函数
 * @param callback
 */
export function onUnmounted(callback: () => void) {
  const component = getSetupContext()
  if (!component.unmountedCallbacks) {
    component.unmountedCallbacks = []
  }
  component.unmountedCallbacks.push(callback)
}
