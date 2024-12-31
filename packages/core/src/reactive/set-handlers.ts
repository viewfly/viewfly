import { createIterableIterator } from './iterable-iterator'
import { toRaw } from './reactive'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './dep'

export function createSetHandlers(wrapper: (v: unknown) => unknown) {
  return {
    add(this: any, value: any) {
      const target = toRaw(this)
      value = toRaw(value)
      if (!target.has(value)) {
        target.add(value)
        trigger(target, TriggerOpTypes.Add, undefined)
      }
      return this
    },
    delete(this: any, value: any) {
      const target = toRaw(this)
      value = toRaw(value)
      const has = target.has(value)
      const b = target.delete(value)
      if (!has) {
        trigger(target, TriggerOpTypes.Delete, undefined)
      }
      return b
    },
    has(this: any, key: any) {
      const target = toRaw(this)
      key = toRaw(key)
      track(target, TrackOpTypes.Has, key)
      return target.has(key)
    },
    forEach(this: any, callbackFn: (value: any, value2: any, set: Set<any>) => void, thisArg?: any) {
      const target = toRaw(this) as Set<any>
      track(target, TrackOpTypes.Iterate, undefined)
      target.forEach((v, k, m) => {
        callbackFn.call(this, wrapper(v), wrapper(k), m)
      }, thisArg)
    },
    clear(this: any) {
      const target = toRaw(this)
      const size = target.size
      if (size !== 0) {
        target.clear()
        trigger(target, TriggerOpTypes.Clear, undefined)
      }
    },
    [Symbol.iterator]() {
      return this.values()
    },
    ...createIterableIterator(wrapper)
  }
}
