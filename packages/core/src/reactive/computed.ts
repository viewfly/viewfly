import { Dep, popDepContext, pushDepContext } from '../base/dep'
import { registryComponentDestroyCallback } from '../base/component'
import { hasEffectSubscribers, TrackOpTypes, trigger, TriggerOpTypes } from './effect'
import { readonlyProxyHandler } from './reactive'

export interface Computed<T> {
  readonly value: T
}

/**
 * 创建一个 computed，当依赖的值发生变化时，会重新计算值。
 * computed 会返回一个对象，对象的 value 属性是计算的值。
 *
 * 若重新计算的结果与缓存值 `Object.is` 相等，不会对访问该 computed 的订阅者触发更新，
 * 避免无关依赖抖动导致的下游副作用。
 *
 * @param getter 计算函数，用于计算值
 * @returns 一个对象，对象的 value 属性是计算的值
 */
export function computed<T>(getter: () => T): Computed<T> {
  let cacheValue!: T
  let hasCache = false
  let dirty = true

  const target = {
    get value(): T {
      if (dirty) {
        flushComputed(false)
      }
      return cacheValue
    }
  }

  function flushComputed(notify: boolean) {
    dep.destroy()
    pushDepContext(dep)
    try {
      const newValue = getter()
      const changed = !hasCache || !Object.is(newValue, cacheValue)
      hasCache = true
      cacheValue = newValue
      dirty = false
      if (notify && changed) {
        trigger(target, TriggerOpTypes.Set, 'value')
      }
    } finally {
      popDepContext()
    }
  }

  const dep = new Dep(() => {
    if (!dirty) {
      dirty = true
      if (hasEffectSubscribers(target, TrackOpTypes.Get, 'value')) {
        flushComputed(true)
      }
    }
  }, 'sync')

  registryComponentDestroyCallback(() => {
    dep.destroy()
  })

  return new Proxy(target, readonlyProxyHandler) as Computed<T>
}
