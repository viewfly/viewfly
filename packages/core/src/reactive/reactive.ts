import { makeError } from '../_utils/make-error'
import { getStringType, hasOwn } from './_help'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './dep'
import { createArrayHandlers } from './array-handlers'
import { createMapHandlers } from './map-handlers'
import { createSetHandlers } from './set-handlers'

const reactiveErrorFn = makeError('reactive')
export const rawToProxyCache = new WeakMap<object, any>()
export const proxyToRawCache = new WeakMap<object, any>()

export function toRaw<T>(value: T): T {
  if (proxyToRawCache.has(value as object)) {
    return proxyToRawCache.get(value as object)
  }
  return value
}

export function isReactive(value: any) {
  return proxyToRawCache.has(value)
}

export interface ReactiveConfig {
  readonly: boolean
  shallow: boolean
}

let fromInternalWrite = false

export function internalWrite(fn: () => void) {
  fromInternalWrite = true
  fn()
  fromInternalWrite = false
}

export class ObjectReactiveHandler<T extends object> implements ProxyHandler<T> {
  protected isShallow: boolean
  protected isReadonly: boolean

  constructor(config: ReactiveConfig) {
    this.isReadonly = config.readonly
    this.isShallow = config.shallow
  }

  set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    if (this.isReadonly && !fromInternalWrite) {
      throw reactiveErrorFn('Object is readonly!')
    }
    newValue = toRaw(newValue)
    const oldValue = (target as any)[p]

    if (oldValue === newValue) {
      return Reflect.set(target, p, newValue, receiver)
    }

    const b = Reflect.set(target, p, newValue, receiver)
    fromInternalWrite = false
    if (hasOwn(target, p)) {
      trigger(target, TriggerOpTypes.Set, p)
    } else {
      trigger(target, TriggerOpTypes.Add, p)
    }
    return b
  }

  get(target: T, p: string | symbol, receiver: any): any {
    track(target, TrackOpTypes.Get, p)
    const value = Reflect.get(target, p, receiver)
    if (this.isShallow) {
      return value
    }
    return reactive(value)
  }

  deleteProperty(target: T, p: string | symbol): boolean {
    const b = Reflect.deleteProperty(target, p)
    trigger(target, TriggerOpTypes.Delete, p)
    return b
  }

  ownKeys(target: T): ArrayLike<string | symbol> {
    track(target, TrackOpTypes.Iterate)
    return Reflect.ownKeys(target)
  }
}

function noReactive<T>(v: T): T {
  return v
}

export class ArrayReactiveHandler extends ObjectReactiveHandler<any[]> {
  interceptors = createArrayHandlers(this.isShallow ? noReactive : reactive)

  constructor(config: ReactiveConfig) {
    super(config)
  }

  override get(target: any[], p: string | symbol, receiver: any): any {
    if (Reflect.has(this.interceptors, p) && p in target) {
      return (this.interceptors as any)[p]
    }
    return super.get(target, p, receiver)
  }
}

export class MapReactiveHandler extends ObjectReactiveHandler<Map<any, any> | WeakMap<object, any>> {
  interceptors = createMapHandlers(this.isShallow ? noReactive : reactive)

  constructor(config: ReactiveConfig) {
    super(config)
  }

  override get(target: Map<any, any> | WeakMap<object, any>, p: string | symbol, receiver: any) {
    if (Reflect.has(this.interceptors, p) && p in target) {
      return (this.interceptors as any)[p]
    }
    if (p === 'size') {
      track(target, TrackOpTypes.Iterate, p)
      return Reflect.get(target, p)
    }
    return super.get(target, p, receiver)
  }
}

export class SetReactiveHandler extends ObjectReactiveHandler<Set<any> | WeakSet<object>> {
  interceptors = createSetHandlers(this.isShallow ? noReactive : reactive)

  constructor(config: ReactiveConfig) {
    super(config)
  }

  override get(target: Set<any> | WeakSet<object>, p: string | symbol, receiver: any): any {
    if (Reflect.has(this.interceptors, p) && p in target) {
      return (this.interceptors as any)[p]
    }
    if (p === 'size') {
      track(target, TrackOpTypes.Iterate, p)
      return Reflect.get(target, p)
    }
    return super.get(target, p, receiver)
  }
}

export const defaultObjectReactiveHandler = new ObjectReactiveHandler({
  readonly: false,
  shallow: false
})

export const defaultArrayReactiveHandler = new ArrayReactiveHandler({
  readonly: false,
  shallow: false
})

export const defaultMapReactiveHandler = new MapReactiveHandler({
  readonly: false,
  shallow: false
})

export const defaultSetReactiveHandler = new SetReactiveHandler({
  readonly: false,
  shallow: false
})

export const readonlyProxyHandler = new ObjectReactiveHandler({
  shallow: true,
  readonly: true
})

export function reactive<T>(raw: T): T {
  if (isReactive(raw)) {
    return raw
  }
  let proxy = rawToProxyCache.get(raw as object)
  if (proxy) {
    return proxy
  }
  const type = getStringType(raw)
  switch (type) {
    case '[object Object]':
      proxy = new Proxy(raw as any, defaultObjectReactiveHandler)
      break
    case '[object Array]':
      proxy = new Proxy(raw as any, defaultArrayReactiveHandler)
      break
    case '[object Set]':
    case '[object WeakSet]':
      proxy = new Proxy(raw as any, defaultSetReactiveHandler)
      break
    case '[object Map]':
    case '[object WeakMap]':
      proxy = new Proxy(raw as any, defaultMapReactiveHandler)
      break
    default:
      return raw
  }
  rawToProxyCache.set(raw as any, proxy)
  proxyToRawCache.set(proxy, raw)
  return proxy
}
