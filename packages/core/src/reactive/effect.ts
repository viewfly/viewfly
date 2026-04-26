import { isArray } from './_help'
import { Dep, getDepContext } from '../base/dep'
import { makeError } from '../_utils/make-error'

type Effects = Set<Dep>

type EffectRecord = Map<any, Effects>

type Subscriber = Map<TrackOpTypes, EffectRecord>

const subscribers = new WeakMap<object, Subscriber>()
const pendingDeps = new Set<Dep>()
let isFlushScheduled = false

const effectErrorFn = makeError('Effect')

function scheduleDep(dep: Dep) {
  if (dep.flushMode === 'sync') {
    dep.effect()
    return
  }
  pendingDeps.add(dep)
  if (!isFlushScheduled) {
    isFlushScheduled = true
    queueMicrotask(flushPendingDeps)
  }
}

function flushPendingDeps() {
  try {
    while (pendingDeps.size > 0) {
      const deps = Array.from(pendingDeps)
      pendingDeps.clear()
      deps.forEach(dep => {
        dep.effect()
      })
    }
  } finally {
    isFlushScheduled = false
    if (pendingDeps.size > 0) {
      isFlushScheduled = true
      queueMicrotask(flushPendingDeps)
    }
  }
}

export function nextTick() {
  return Promise.resolve()
}

/**
 * 同步清空响应式调度队列。
 * @internal 仅用于框架内部桥接与测试控制，不建议业务代码使用。
 */
export function flushReactiveEffectsSync() {
  flushPendingDeps()
}

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
    const deps = [...effects]
    deps.forEach(dep => scheduleDep(dep))
  }
}

function collectAllEffects(record: EffectRecord | undefined, effectSet: Set<Dep>) {
  if (!record) {
    return
  }
  record.forEach(effects => {
    effects.forEach(effect => {
      effectSet.add(effect)
    })
  })
}


export function trigger(target: object, type: TriggerOpTypes, key: unknown = unKnownKey) {
  const subscriber = subscribers.get(target)
  if (!subscriber) {
    return
  }
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
      case TriggerOpTypes.Clear: {
        const effects = new Set<Dep>()
        collectAllEffects(subscriber.get(TrackOpTypes.Get), effects)
        collectAllEffects(subscriber.get(TrackOpTypes.Has), effects)
        collectAllEffects(subscriber.get(TrackOpTypes.Iterate), effects)
        effects.forEach(effect => scheduleDep(effect))
        break
      }
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
      case TriggerOpTypes.Clear: {
        const effects = new Set<Dep>()
        collectAllEffects(subscriber.get(TrackOpTypes.Get), effects)
        collectAllEffects(subscriber.get(TrackOpTypes.Has), effects)
        collectAllEffects(subscriber.get(TrackOpTypes.Iterate), effects)
        effects.forEach(effect => scheduleDep(effect))
        break
      }
      default:
        throw effectErrorFn(`trigger: type '${type}' is not supported`)
    }
    return
  }
  switch (type) {
    case TriggerOpTypes.Add:
      runEffect(key, subscriber.get(TrackOpTypes.Get))
      runEffect(key, subscriber.get(TrackOpTypes.Has))
      break
    case TriggerOpTypes.Set:
      runEffect(key, subscriber.get(TrackOpTypes.Get))
      break
    case TriggerOpTypes.Delete:
      runEffect(key, subscriber.get(TrackOpTypes.Get))
      runEffect(key, subscriber.get(TrackOpTypes.Has))
      break
    case TriggerOpTypes.Iterate:
      runEffect(key, subscriber.get(TrackOpTypes.Iterate))
      break
    default:
      throw effectErrorFn(`trigger: type '${type}' is not supported`)
  }
}
