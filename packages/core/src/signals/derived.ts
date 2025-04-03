import { Dep, popDepContext, pushDepContext, registryComponentDestroyCallback } from '../base/_api'
import { createSignal, Signal } from './signal'

/**
 * 使用派生值，Viewfly 会收集回调函数内同步执行时访问的 Signal，
 * 并在你获取 createDerived 函数返回的 Signal 的值时，自动计算最新的值。
 *
 * @param fn
 * @param isContinue 可选的停止函数，在每次值更新后调用，当返回值为 false 时，将不再监听依赖的变化
 */
export function createDerived<T>(fn: () => T, isContinue?: (data: T) => unknown): Signal<T> {
  let isStop = false

  function canListen(value: T) {
    if (isContinue) {
      const b = isContinue(value)
      if (b === false) {
        listener.destroy()
        return false
      }
    }
    return true
  }

  const listener = new Dep(() => {
    if (isStop) {
      return
    }
    isStop = true
    listener.destroy()
    pushDepContext(listener)
    const value = fn()
    popDepContext()
    signal.set(value)
    canListen(value)
    isStop = false
  })
  pushDepContext(listener)
  const value = fn()
  const signal = createSignal(value)
  popDepContext()
  isStop = false
  if (canListen(value)) {
    registryComponentDestroyCallback(() => listener.destroy())
  }
  return signal
}
