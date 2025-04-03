import { Dep, popDepContext, pushDepContext, registryComponentDestroyCallback } from '../base/_api'
import { Signal } from './signal'

export interface EffectCallback<T> {
  (newValue: T, oldValue: T): void | (() => void)
}

/**
 * 监听状态变化，当任意一个状态发生变更时，触发回调。
 * createEffect 会返回一个取消监听的函数，调用此函数，可以取消监听。
 * 当在组件中调用时，组件销毁时会自动取消监听。
 * @param deps 依赖的状态 Signal，可以是一个 Signal，只可以一个数包含 Signal 的数组，或者是一个求值函数
 * @param callback 状态变更后的回调函数
 */

/* eslint-disable max-len*/
export function createEffect<T>(deps: Signal<T>, callback: EffectCallback<T>): () => void
export function createEffect<T>(deps: [Signal<T>], callback: EffectCallback<[T]>): () => void
export function createEffect<T, T1>(deps: [Signal<T>, Signal<T1>], callback: EffectCallback<[T, T1]>): () => void
export function createEffect<T, T1, T2>(deps: [Signal<T>, Signal<T1>, Signal<T2>], callback: EffectCallback<[T, T1, T2]>): () => void
export function createEffect<T, T1, T2, T3>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>], callback: EffectCallback<[T, T1, T2, T3]>): () => void
export function createEffect<T, T1, T2, T3, T4>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>], callback: EffectCallback<[T, T1, T2, T3, T4]>): () => void
export function createEffect<T, T1, T2, T3, T4, T5>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>], callback: EffectCallback<[T, T1, T2, T3, T4, T5]>): () => void
export function createEffect<T, T1, T2, T3, T4, T5, T6>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>], callback: EffectCallback<[T, T1, T2, T3, T4, T5, T6]>): () => void
export function createEffect<T, T1, T2, T3, T4, T5, T6, T7>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>, Signal<T7>], callback: EffectCallback<[T, T1, T2, T3, T4, T5, T6, T7]>): () => void
export function createEffect<T>(deps: () => T, callback: EffectCallback<T>): () => void
export function createEffect<T = any>(deps: Signal<any>[], callback: EffectCallback<T[]>): () => void
/* eslint-enable max-len*/
export function createEffect(deps: Signal<any> | Signal<any>[] | (() => any), callback: EffectCallback<any>) {
  let prevFn: (() => any) | void
  const isArray = Array.isArray(deps)

  const effect = new Dep(function () {
    if (prevFn) {
      prevFn()
    }
    const newValue = isArray ? deps.map(fn => fn()) : deps()
    prevFn = callback(newValue, oldValue)
    oldValue = newValue
  })

  pushDepContext(effect)
  let oldValue = isArray ? deps.map(fn => fn()) : deps()
  popDepContext()
  let isUnWatch = false

  function unWatch() {
    if (isUnWatch) {
      return
    }
    isUnWatch = true
    if (prevFn) {
      prevFn()
    }
    effect.destroy()
  }

  registryComponentDestroyCallback(unWatch)
  return unWatch
}
