import { toRaw } from './reactive'
import { track, TrackOpTypes } from './dep'

export function createIterableIterator(wrapper: (v: unknown) => unknown) {
  return {
    * entries() {
      const target = toRaw(this) as any
      track(target, TrackOpTypes.Iterate)
      for (const [key, value] of target.entries()) {
        yield [wrapper(key), wrapper(value)]
      }
    },
    * keys() {
      const target = toRaw(this) as any
      track(target, TrackOpTypes.Iterate)
      for (const item of target.keys()) {
        yield wrapper(item)
      }
    },
    * values() {
      const target = toRaw(this) as any
      track(target, TrackOpTypes.Iterate)
      for (const item of target.values()) {
        yield wrapper(item)
      }
    }
  }
}
