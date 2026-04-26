import { Dep, popDepContext, pushDepContext } from '../base/dep'
import { registryComponentDestroyCallback } from '../base/component'
import { trigger, TriggerOpTypes } from './effect'
import { readonlyProxyHandler } from './reactive'

export interface Computed<T> {
  readonly value: T
}

/**
 * 创建一个 computed，当依赖的值发生变化时，会重新计算值。
 * computed 会返回一个对象，对象的 value 属性是计算的值。
 * @param getter 计算函数，用于计算值
 * @returns 一个对象，对象的 value 属性是计算的值
 */
export function computed<T>(getter: () => T): Computed<T> {
  let cacheValue: T
  let dirty = true

  const target = {
    get value() {
      if (dirty) {
        dep.destroy()
        pushDepContext(dep)
        try {
          cacheValue = getter()
          dirty = false
        } finally {
          popDepContext()
        }
      }
      return cacheValue
    }
  }

  const dep = new Dep(() => {
    if (!dirty) {
      dirty = true
      trigger(target, TriggerOpTypes.Set, 'value')
    }
  })

  registryComponentDestroyCallback(() => {
    dep.destroy()
  })

  return new Proxy(target, readonlyProxyHandler) as Computed<T>
}
