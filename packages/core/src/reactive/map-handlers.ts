import { createIterableIterator } from './iterable-iterator'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './dep'
import { toRaw } from './reactive'

export function createMapHandlers(wrapper: (v: unknown) => unknown) {
  return {
    get(this: any, key: any) {
      const target = toRaw(this)
      track(target, TrackOpTypes.Get, key)
      return wrapper(target.get(key))
    },
    set(this: any, key: any, value: any) {
      const target = toRaw(this) as Map<any, any>
      key = toRaw(key)
      value = toRaw(value)
      const has = target.has(key)
      const r = target.set(key, value)
      trigger(target, has ? TriggerOpTypes.Set : TriggerOpTypes.Add, key)
      return r
    },
    has(this: any, key: any) {
      const target = toRaw(this)
      key = toRaw(key)
      track(target, TrackOpTypes.Has, key)
      return target.has(key)
    },
    delete(this: any, key: any) {
      const target = toRaw(this)
      key = toRaw(key)
      const r = target.delete(key)
      trigger(target, TriggerOpTypes.Delete, key)
      return r
    },
    forEach(this: any, callbackFn: (value: any, key: any, map: Map<any, any>) => void, thisArg?: any) {
      const target = toRaw(this) as Map<any, any>
      track(target, TrackOpTypes.Iterate, undefined)
      target.forEach((v, k, m) => {
        callbackFn.call(this, wrapper(v), wrapper(k), m)
      }, thisArg)
    },
    clear(this: any) {
      const target = toRaw(this)
      target.clear()
      trigger(target, TriggerOpTypes.Clear, undefined)
    },
    [Symbol.iterator]() {
      return this.entries()
    },
    ...createIterableIterator(wrapper)
  }
}
