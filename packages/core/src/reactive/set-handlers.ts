import { createIterableIterator } from './iterable-iterator'
import { toRaw } from './reactive'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './effect'

export function createSetHandlers(wrapper: (v: unknown) => unknown) {
  return {
    add(this: any, value: any) {
      const target = toRaw(this)
      value = toRaw(value)
      if (!target.has(value)) {
        target.add(value)
        trigger(target, TriggerOpTypes.Add, value)
        trigger(target, TriggerOpTypes.Iterate)
      }
      return this
    },
    delete(this: any, value: any) {
      const target = toRaw(this)
      value = toRaw(value)
      const b = target.delete(value)
      if (b) {
        trigger(target, TriggerOpTypes.Delete, value)
        trigger(target, TriggerOpTypes.Iterate)
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
      track(target, TrackOpTypes.Iterate)
      target.forEach((v, k, m) => {
        callbackFn.call(this, wrapper(v), wrapper(k), m)
      }, thisArg)
    },
    clear(this: any) {
      const target = toRaw(this)
      const size = target.size
      if (size !== 0) {
        target.clear()
        trigger(target, TriggerOpTypes.Clear)
      }
    },
    [Symbol.iterator]() {
      return this.values()
    },
    ...createIterableIterator(wrapper)
  }
}
