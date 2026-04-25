import { isArray } from './_help'
import { Dep, getDepContext } from '../base/dep'

type Effects = Set<Dep>

type EffectRecord = Map<any, Effects>

type Subscriber = Map<TrackOpTypes, EffectRecord>

const subscribers = new WeakMap<object, Subscriber>()

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
  Splice = 'Splice',
}

const unKnownKey = Symbol('unKnownKey')

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
      })
    } else if (!effects.has(dep)) {
      dep.destroyCallbacks.push(() => {
        effects!.delete(dep)
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
    switch (type) {
      case TriggerOpTypes.Set:
        if (isArray(target)) {
          const iterateRecord = subscriber.get(TrackOpTypes.Iterate)
          runEffect(unKnownKey, iterateRecord)
        }
        runEffect(key, subscriber.get(TrackOpTypes.Get))
        runEffect(key, subscriber.get(TrackOpTypes.Has))
        break
      case TriggerOpTypes.Add:
      case TriggerOpTypes.Clear:
      case TriggerOpTypes.Delete:
      case TriggerOpTypes.Splice: {
        const iterateRecord = subscriber.get(TrackOpTypes.Iterate)
        runEffect(unKnownKey, iterateRecord)
        runEffect(key, subscriber.get(TrackOpTypes.Has))
        runEffect(key, subscriber.get(TrackOpTypes.Get))
      }
        break
    }
  }
}
