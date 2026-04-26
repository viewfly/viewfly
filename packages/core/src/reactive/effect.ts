import { isArray } from './_help'
import { Dep, getDepContext } from '../base/dep'
import { makeError } from '../_utils/make-error'

type Effects = Set<Dep>

type EffectRecord = Map<any, Effects>

type Subscriber = Map<TrackOpTypes, EffectRecord>

const subscribers = new WeakMap<object, Subscriber>()

const effectErrorFn = makeError('Effect')

function getSubscriber(target: object): Subscriber {
  let subscriber = subscribers.get(target)
  if (!subscriber) {
    subscriber = new Map<TrackOpTypes, EffectRecord>()
    subscribers.set(target, subscriber)
  }
  return subscriber
}

export enum TrackOpTypes {
  Get = 'Get',
  Has = 'Has',
  Iterate = 'Iterate',
}

export enum TriggerOpTypes {
  Set = 'Set',
  Add = 'Add',
  Delete = 'Delete',
  Clear = 'Clear',
  Iterate = 'Iterate',
}

const unKnownKey = Symbol('unKnownKey')

function cleanupEmptyEffects(target: object,
                             type: TrackOpTypes,
                             key: unknown,
                             effects: Effects,
                             record: EffectRecord,
                             subscriber: Subscriber) {
  if (effects.size > 0) {
    return
  }
  record.delete(key)
  if (record.size > 0) {
    return
  }
  subscriber.delete(type)
  if (subscriber.size === 0) {
    subscribers.delete(target)
  }
}

export function track(target: object, type: TrackOpTypes, key: unknown = unKnownKey) {
  const dep = getDepContext()
  if (dep) {
    const subscriber = getSubscriber(target)
    let record = subscriber.get(type)

    if (!record) {
      record = new Map<any, Effects>()
      subscriber.set(type, record)
    }

    let effects = record.get(key)
    if (!effects) {
      effects = new Set<Dep>([dep])
      record.set(key, effects)
      dep.destroyCallbacks.push(() => {
        effects!.delete(dep)
        cleanupEmptyEffects(target, type, key, effects!, record!, subscriber)
      })
    } else if (!effects.has(dep)) {
      dep.destroyCallbacks.push(() => {
        effects!.delete(dep)
        cleanupEmptyEffects(target, type, key, effects!, record!, subscriber)
      })
      effects.add(dep)
    }
  }
}

function runEffect(key: unknown, record?: EffectRecord) {
  if (!record) {
    return
  }
  const effects = record.get(key)
  if (effects) {
    const fns = [...effects]
    fns.forEach(i => i.effect())
  }
}


export function trigger(target: object, type: TriggerOpTypes, key: unknown = unKnownKey) {
  const subscriber = getSubscriber(target)
  if (subscriber) {
    if (isArray(target)) {
      switch (type) {
        case TriggerOpTypes.Set:
          runEffect(key, subscriber.get(TrackOpTypes.Get))
          runEffect(key, subscriber.get(TrackOpTypes.Has))
          break
        case TriggerOpTypes.Iterate:
          runEffect(key, subscriber.get(TrackOpTypes.Iterate))
          break
        case TriggerOpTypes.Delete:
          runEffect(key, subscriber.get(TrackOpTypes.Get))
          runEffect(key, subscriber.get(TrackOpTypes.Has))
          break
        default:
          throw effectErrorFn(`trigger: type '${type}' is not supported`)
      }
      return
    }
    if (target instanceof Map || target instanceof WeakMap) {
      switch (type) {
        case TriggerOpTypes.Set:
        case TriggerOpTypes.Add:
          runEffect(key, subscriber.get(TrackOpTypes.Get))
          runEffect(key, subscriber.get(TrackOpTypes.Has))
          break
        case TriggerOpTypes.Iterate:
          runEffect(key, subscriber.get(TrackOpTypes.Iterate))
          break
        case TriggerOpTypes.Delete:
          runEffect(key, subscriber.get(TrackOpTypes.Get))
          runEffect(key, subscriber.get(TrackOpTypes.Has))
          runEffect(key, subscriber.get(TrackOpTypes.Iterate))
          break
        default:
          throw effectErrorFn(`trigger: type '${type}' is not supported`)
      }
      return
    }
    if (target instanceof Set || target instanceof WeakSet) {
      switch (type) {
        case TriggerOpTypes.Add:
          runEffect(key, subscriber.get(TrackOpTypes.Get))
          runEffect(key, subscriber.get(TrackOpTypes.Has))
          break
        case TriggerOpTypes.Iterate:
          runEffect(key, subscriber.get(TrackOpTypes.Iterate))
          break
        case TriggerOpTypes.Delete:
          runEffect(key, subscriber.get(TrackOpTypes.Get))
          runEffect(key, subscriber.get(TrackOpTypes.Has))
          runEffect(key, subscriber.get(TrackOpTypes.Iterate))
          break
        default:
          throw effectErrorFn(`trigger: type '${type}' is not supported`)
      }
      return
    }
    switch (type) {
      case TriggerOpTypes.Set:
        runEffect(key, subscriber.get(TrackOpTypes.Get))
        runEffect(key, subscriber.get(TrackOpTypes.Has))
        break
      case TriggerOpTypes.Add:
      case TriggerOpTypes.Clear:
      case TriggerOpTypes.Delete: {
        const iterateRecord = subscriber.get(TrackOpTypes.Iterate)
        runEffect(unKnownKey, iterateRecord)
        runEffect(key, subscriber.get(TrackOpTypes.Has))
        runEffect(key, subscriber.get(TrackOpTypes.Get))
      }
        break
    }
  }
}
