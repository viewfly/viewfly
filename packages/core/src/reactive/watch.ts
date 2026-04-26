import { registryComponentDestroyCallback } from '../base/component'
import { watchEffect } from './watch-effect'

/**
 * 创建一个 watch，当依赖的值发生变化时，会执行 callback 函数。
 * watch 会返回一个函数，用于停止监听。
 * @param trigger 触发函数，用于获取依赖的值
 * @param callback 回调函数，当依赖的值发生变化时，会执行 callback 函数
 * @returns 一个函数，用于停止监听
 */
export function watch<T>(trigger: () => T, callback: (newValue: T, oldValue: T) => void) {
  const initValue = {}
  let oldValue = initValue as T
  const unWatch = watchEffect(function () {
    if (oldValue === initValue) {
      oldValue = trigger()
      return
    }
    const newValue = trigger()
    if (!Object.is(newValue, oldValue)) {
      callback(newValue, oldValue)
      oldValue = newValue
    }
  })

  registryComponentDestroyCallback(unWatch)
  return unWatch
}
