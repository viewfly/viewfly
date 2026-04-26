import { makeError } from '../_utils/make-error'
import { getStringType, hasOwn } from './_help'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './effect'
import { createArrayHandlers, triggerArrayByRange } from './array-handlers'
import { createMapHandlers } from './map-handlers'
import { createSetHandlers } from './set-handlers'

const reactiveErrorFn = makeError('reactive')
export const rawToProxyCache = new WeakMap<object, any>()
export const proxyToRawCache = new WeakMap<object, any>()
export const shallowRawToProxyCache = new WeakMap<object, any>()
export const shallowProxyToRawCache = new WeakMap<object, any>()

/**
 * 将响应式对象转换为原始对象
 * @param value 响应式对象
 * @returns 原始对象
 * @example
 * ```tsx
 * const obj = reactive({
 *   name: 'John',
 *   age: 18
 * })
 * console.log(toRaw(obj))
 * ```
 */
export function toRaw<T>(value: T): T {
  if (proxyToRawCache.has(value as object)) {
    return proxyToRawCache.get(value as object)
  }
  if (shallowProxyToRawCache.has(value as object)) {
    return shallowProxyToRawCache.get(value as object)
  }
  return value
}

/**
 * 检查对象是否是响应式对象
 * @param value 要检查的对象
 * @returns 是否是响应式对象
 * @example
 * ```tsx
 * const obj = reactive({
 *   name: 'John',
 *   age: 18
 * })
 * console.log(isReactive(obj))
 * ```
 */
export function isReactive(value: any) {
  return proxyToRawCache.has(value) || shallowProxyToRawCache.has(value)
}

export interface ReactiveConfig {
  readonly: boolean
  shallow: boolean
}

let fromInternalWrite = false

/**
 * 内部写入，用于避免类型为只读的响应式对象写入报错
 * @param fn 要执行的函数
 * @internal
 */
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
    const rawValue = toRaw(newValue)
    const oldValue = (target as any)[p]

    const v = this.isShallow ? newValue : rawValue

    if (oldValue === rawValue) {
      return Reflect.set(target, p, v, receiver)
    }

    const has = hasOwn(target, p)
    const b = Reflect.set(target, p, v, receiver)
    fromInternalWrite = false
    if (has) {
      trigger(target, TriggerOpTypes.Set, p)
    } else {
      trigger(target, TriggerOpTypes.Add, p)
      trigger(target, TriggerOpTypes.Iterate)
    }
    return b
  }

  get(target: T, p: string | symbol, receiver: any): any {
    track(target, TrackOpTypes.Get, p)
    const value = Reflect.get(target, p, receiver)
    if (this.isShallow || !value || typeof value !== 'object') {
      return value
    }
    return reactive(value)
  }

  deleteProperty(target: T, p: string | symbol): boolean {
    if (this.isReadonly && !fromInternalWrite) {
      throw reactiveErrorFn('Object is readonly!')
    }
    const b = Reflect.deleteProperty(target, p)
    trigger(target, TriggerOpTypes.Delete, p)
    trigger(target, TriggerOpTypes.Iterate)
    return b
  }

  ownKeys(target: T): ArrayLike<string | symbol> {
    track(target, TrackOpTypes.Iterate)
    return Reflect.ownKeys(target)
  }

  has(target: T, p: string | symbol): boolean {
    track(target, TrackOpTypes.Has, p)
    return Reflect.has(target, p)
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
    if (p === 'length') {
      track(target, TrackOpTypes.Iterate)
      return Reflect.get(target, p, receiver)
    }
    return super.get(target, p, receiver)
  }

  override set(target: any[], p: string | symbol, newValue: any, receiver: any): boolean {
    if (this.isReadonly && !fromInternalWrite) {
      throw reactiveErrorFn('Object is readonly!')
    }
    if (p === 'length') {
      const oldLength = target.length
      const b = super.set(target, p, newValue, receiver)
      const newLength = target.length
      if (newLength < oldLength) {
        triggerArrayByRange(target, newLength, oldLength)
      }
      if (oldLength !== newLength) {
        trigger(target, TriggerOpTypes.Iterate)
      }
      return b
    }

    const rawValue = toRaw(newValue)
    const oldValue = (target as any)[p]

    const v = this.isShallow ? newValue : rawValue

    if (oldValue === rawValue) {
      return Reflect.set(target, p, v, receiver)
    }

    const oldLength = target.length
    const b = Reflect.set(target, p, v, receiver)
    fromInternalWrite = false

    const newLength = target.length
    trigger(target, TriggerOpTypes.Set, p)
    trigger(target, TriggerOpTypes.Iterate)
    if (newLength > oldLength) {
      trigger(target, TriggerOpTypes.Set, 'length')
    }
    return b
  }

  override deleteProperty(target: any[], p: string | symbol): boolean {
    if (this.isReadonly && !fromInternalWrite) {
      throw reactiveErrorFn('Object is readonly!')
    }
    const b = Reflect.deleteProperty(target, p)
    trigger(target, TriggerOpTypes.Delete, p)
    return b
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
      track(target, TrackOpTypes.Iterate)
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
      track(target, TrackOpTypes.Iterate)
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

export function createShallowReadonlyProxy<T extends object>(value: T): Readonly<T> {
  return new Proxy(value, readonlyProxyHandler) as Readonly<T>
}

/**
 * 创建一个响应式对象
 * @param raw 原始对象
 * @returns 响应式对象
 * @example
 * ```tsx
 * const obj = reactive({
 *   name: 'John',
 *   age: 18,
 *   children: [
 *     {
 *       name: 'Jane',
 *       age: 16
 *     }
 *   ]
 * })
 * console.log(obj.name)
 * console.log(obj.children[0].name)
 * ```
 */
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
