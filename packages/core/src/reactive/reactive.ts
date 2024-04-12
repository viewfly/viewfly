import { makeError } from '../_utils/make-error'
import { hasOwn, isArray, isMap, isSet, isWeakMap, isWeakSet } from './_help'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './dep'

const reactiveErrorFn = makeError('reactive')
const rawToProxyCache = new WeakMap<object, any>()
const proxyToRawCache = new WeakMap<object, any>()

export function toRaw<T extends object>(value: T): T {
  if (proxyToRawCache.has(value)) {
    return proxyToRawCache.get(value)
  }
  return value
}

export function isReactive(value: any) {
  return proxyToRawCache.has(value)
}

const iterableIteratorMethods = {
  * entries() {
    const target = toRaw(this) as any
    track(target, TrackOpTypes.Iterate)
    for (const [key, value] of target.entries()) {
      yield [reactive(key), reactive(value)]
    }
  },
  * keys() {
    const target = toRaw(this) as any
    track(target, TrackOpTypes.Iterate)
    for (const item of target.keys()) {
      yield reactive(item)
    }
  },
  * values() {
    const target = toRaw(this) as any
    track(target, TrackOpTypes.Iterate)
    for (const item of target.values()) {
      yield reactive(item)
    }
  }
}

const mapTypeInterceptors: Record<string | symbol, any> = {
  get(this: any, key: any) {
    const target = toRaw(this)
    track(target, TrackOpTypes.Get, key)
    return reactive(target.get(key))
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
    const target = proxyToRawCache.get(this) as Map<any, any>
    track(target, TrackOpTypes.Iterate, undefined)
    target.forEach((v, k, m) => {
      callbackFn.call(this, reactive(v), reactive(k), m)
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
  ...iterableIteratorMethods
}

const setTypeInterceptors: Record<string | symbol, any> = {
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
    const target = proxyToRawCache.get(this) as Set<any>
    track(target, TrackOpTypes.Iterate, undefined)
    target.forEach((v, k, m) => {
      callbackFn.call(this, reactive(v), reactive(k), m)
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
  ...iterableIteratorMethods
}

function applyPredicateMethod(self: any, methodName: string, predicate: Function, thisArg?: any) {
  const target = toRaw(self)
  track(target, TrackOpTypes.Iterate)
  return target[methodName]((value: unknown, index: number, array: unknown[]) => {
    return predicate.call(target, reactive(value), index, array)
  }, thisArg)
}

function applySearchMethod(self: any, methodName: string, searchElement: unknown, fromIndex?: number) {
  const target = toRaw(self)
  track(target, TrackOpTypes.Iterate)
  return target[methodName](searchElement, fromIndex)
}

const arrayTypeInterceptors: Record<string | symbol, any> = {
  concat(this: any, ...items: any[]): any[] {
    const target = toRaw(this)
    trigger(target, TriggerOpTypes.Add)
    return target.concat(...items)
  },
  every(this: any,
        predicate: (value: unknown, index: number, array: unknown[]) => unknown,
        thisArg?: unknown) {
    return applyPredicateMethod(this, 'every', predicate, thisArg)
  },
  filter(this: any, predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any) {
    return applyPredicateMethod(this, 'filter', predicate, thisArg)
  },
  find(predicate: (value: unknown, index: number, obj: unknown[]) => unknown, thisArg?: any) {
    return applyPredicateMethod(this, 'find', predicate, thisArg)
  },
  findIndex(predicate: (value: unknown, index: number, obj: unknown[]) => unknown, thisArg?: any): number {
    return applyPredicateMethod(this, 'findIndex', predicate, thisArg)
  },
  findLast(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any) {
    return applyPredicateMethod(this, 'findLast', predicate, thisArg)
  },
  findLastIndex(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): number {
    return applyPredicateMethod(this, 'findLastIndex', predicate, thisArg)
  },
  forEach(callbackfn: (value: unknown, index: number, array: unknown[]) => void, thisArg?: any) {
    return applyPredicateMethod(this, 'forEach', callbackfn, thisArg)
  },
  includes(searchElement: unknown, fromIndex?: number): boolean {
    return applySearchMethod(this, 'includes', searchElement, fromIndex)
  },
  indexOf(searchElement: unknown, fromIndex?: number): number {
    return applySearchMethod(this, 'indexOf', searchElement, fromIndex)
  },
  join(separator?: string): string {
    const target = toRaw(this)
    track(target, TrackOpTypes.Iterate)
    return target.join(separator)
  },
  lastIndexOf(searchElement: unknown, fromIndex?: number): number {
    return applySearchMethod(this, 'lastIndexOf', searchElement, fromIndex)
  },
  map<U>(callbackFn: (value: unknown, index: number, array: unknown[]) => U, thisArg?: any): U[] {
    return applyPredicateMethod(this, 'map', callbackFn, thisArg)
  },
  pop() {
    const target = toRaw(this)
    trigger(target, TriggerOpTypes.Delete)
    return target.pop()
  },
  push(this: any, ...items: any[]) {
    const target = toRaw(this)
    trigger(target, TriggerOpTypes.Add)
    return target.push(...items)
  },
  reduce(
    callbackFn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown,
    ...args: any[]) {
    const target = toRaw(this)
    track(target, TrackOpTypes.Iterate)
    return target.reduce((p: unknown, c: unknown, i: number, a: unknown[]) => {
      if (args.length > 0) {
        return callbackFn(p, reactive(c), i, a)
      }
      return callbackFn(reactive(p), reactive(c), i, a)
    }, ...args)
  },
  reduceRight(
    callbackFn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown,
    ...args: any[]) {
    const target = toRaw(this)
    track(target, TrackOpTypes.Iterate)
    return target.reduceRight((p: unknown, c: unknown, i: number, a: unknown[]) => {
      if (args.length > 0) {
        return callbackFn(p, reactive(c), i, a)
      }
      return callbackFn(reactive(p), reactive(c), i, a)
    }, ...args)
  },
  shift() {
    const target = toRaw(this)
    trigger(target, TriggerOpTypes.Delete)
    return target.shift()
  },
  some(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): boolean {
    return applyPredicateMethod(this, 'some', predicate, thisArg)
  },
  splice(start: number, deleteCount?: number) {
    const target = toRaw(this) as unknown[]
    trigger(target, TriggerOpTypes.Set)
    trigger(target, TriggerOpTypes.Add)
    trigger(target, TriggerOpTypes.Delete)
    return target.splice(start, deleteCount).map(i => reactive(i))
  },
  toReversed() {
    const target = toRaw(this)
    track(target, TrackOpTypes.Iterate)
    return target.toReversed()
  },
  toSorted(compareFn?: (a: unknown, b: unknown) => number) {
    const target = toRaw(this)
    track(target, TrackOpTypes.Iterate)
    return target.toSorted(compareFn)
  },
  toSpliced(start: number, deleteCount: number, ...items: any[]) {
    const target = toRaw(this)
    track(target, TrackOpTypes.Iterate)
    return target.toSpliced(start, deleteCount, ...items)
  },
  unshift(...items: any[]): number {
    const target = toRaw(this)
    trigger(target, TriggerOpTypes.Add)
    return target.unshift(...items)
  },
  [Symbol.iterator]() {
    return this.values()
  },
  ...iterableIteratorMethods
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

export class ReactiveHandler<T extends object> implements ProxyHandler<T> {
  constructor(private config: ReactiveConfig) {
  }

  set(target: T, p: string | symbol, newValue: any, receiver: any): boolean {
    if (this.config.readonly && !fromInternalWrite) {
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
    if (isArray(target) && Reflect.has(arrayTypeInterceptors, p) && p in target) {
      return arrayTypeInterceptors[p]
    }
    if (Reflect.has(mapTypeInterceptors, p) && p in target && (isMap(target) || isWeakMap(target))) {
      return mapTypeInterceptors[p]
    }
    if (Reflect.has(setTypeInterceptors, p) && p in target && (isSet(target) || isWeakSet(target))) {
      return setTypeInterceptors[p]
    }

    if (p === 'size' && (isMap(target) || isSet(target))) {
      track(target, TrackOpTypes.Iterate, p)
      return Reflect.get(target, p)
    }
    track(target, TrackOpTypes.Get, p)
    const value = Reflect.get(target, p, receiver)
    if (this.config.shallow) {
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

export const defaultReactiveHandler = new ReactiveHandler({
  readonly: false,
  shallow: false
})

export const readonlyProxyHandler = new ReactiveHandler({
  shallow: false,
  readonly: true
})

export function reactive<T>(raw: T): T {
  if (raw === null || typeof raw !== 'object') {
    return raw
  }
  let proxy = rawToProxyCache.get(raw as object)
  if (proxy) {
    return proxy
  }
  proxy = new Proxy(raw, defaultReactiveHandler)
  rawToProxyCache.set(raw, proxy)
  proxyToRawCache.set(proxy, raw)
  return proxy
}


