import { Dep, popDepContext, pushDepContext, registryComponentDestroyCallback } from '@viewfly/core'

/**
 * 创建一个 watchEffect，立即执行 effect 函数，当依赖的值发生变化时，会再次执行 effect 函数。
 * watchEffect 会返回一个函数，用于停止监听
 * @param effect 执行的函数
 * @returns 一个函数，用于停止监听
 */
export function watchEffect(effect: () => void) {
  const dep = new Dep(function () {
    pushDepContext(dep)
    effect()
    popDepContext()
  })

  pushDepContext(dep)
  effect()
  popDepContext()

  function unWatch() {
    dep.destroy()
  }
  registryComponentDestroyCallback(unWatch)
  return unWatch
}
