import { getCurrentListener, Listener, popListener, pushListener } from './listener'
import { getSetupContext } from './component'

/**
 * 组件状态实例，直接调用可以获取最新的状态，通过 set 方法可以更新状态
 */
export interface Signal<T> {
  /**
   *  直接调用一个 Signal 实例，可以获取最新状态
   */
  (): T

  /**
   * 更新组件状态的方法，可以传入最新的值
   * @param newState
   */
  set(newState: T): void
}

/**
 * 组件状态管理器
 * @param state 初始状态
 * @example
 * ```tsx
 * function App() {
 *   // 初始化状态
 *   const state = createSignal(1)
 *
 *   return () => {
 *     <div>
 *       <div>当前值为：{state()}</div>
 *       <div>
 *         <button type="button" onClick={() => {
 *           // 当点击时更新状态
 *           state.set(state() + 1)
 *         }
 *         }>updateState</button>
 *       </div>
 *     </div>
 *   }
 * }
 */
export function createSignal<T>(state: T): Signal<T> {
  const subscribers = new Set<Listener>()

  function signal() {
    const listener = getCurrentListener()
    if (listener) {
      listener.destroyCallbacks.push(() => {
        subscribers.delete(listener)
      })
      subscribers.add(listener)
    }
    return state
  }

  signal.set = function (newValue: T) {
    if (newValue === state) {
      return
    }
    state = newValue
    const listeners = Array.from(subscribers)
    listeners.forEach(listener => listener.effect())
  }
  return signal
}

/**
 * 使用派生值，Viewfly 会收集回调函数内同步执行时访问的 Signal，
 * 并在你获取 createDerived 函数返回的 Signal 的值时，自动计算最新的值。
 *
 * @param fn
 * @param isContinue 可选的停止函数，在每次值更新后调用，当返回值为 false 时，将不再监听依赖的变化
 */
export function computed<T>(fn: () => T, isContinue?: (data: T) => unknown): Signal<T> {
  let isStop = false

  function canListen(value: T) {
    if (isContinue) {
      const b = isContinue(value)
      if (b === false) {
        listener.destroy()
        return false
      }
    }
    return true
  }

  const listener = new Listener(() => {
    if (isStop) {
      return
    }
    isStop = true
    listener.destroy()
    pushListener(listener)
    const value = fn()
    popListener()
    signal.set(value)
    canListen(value)
    isStop = false
  })
  pushListener(listener)
  const value = fn()
  const signal = createSignal(value)
  popListener()
  isStop = false
  if (canListen(value)) {
    registryComponentDestroyCallback(() => listener.destroy())
  }
  return signal
}

export const createDerived = computed

export interface WatchCallback<T> {
  (newValue: T, oldValue: T): void | (() => void)
}

/**
 * 监听状态变化，当任意一个状态发生变更时，触发回调。
 * watch 会返回一个取消监听的函数，调用此函数，可以取消监听。
 * 当在组件中调用时，组件销毁时会自动取消监听。
 * @param deps 依赖的状态 Signal，可以是一个 Signal，只可以一个数包含 Signal 的数组，或者是一个求值函数
 * @param callback 状态变更后的回调函数
 */

/* eslint-disable max-len*/
export function watch<T>(deps: Signal<T>, callback: WatchCallback<T>): () => void
export function watch<T>(deps: [Signal<T>], callback: WatchCallback<[T]>): () => void
export function watch<T, T1>(deps: [Signal<T>, Signal<T1>], callback: WatchCallback<[T, T1]>): () => void
export function watch<T, T1, T2>(deps: [Signal<T>, Signal<T1>, Signal<T2>], callback: WatchCallback<[T, T1, T2]>): () => void
export function watch<T, T1, T2, T3>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>], callback: WatchCallback<[T, T1, T2, T3]>): () => void
export function watch<T, T1, T2, T3, T4>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>], callback: WatchCallback<[T, T1, T2, T3, T4]>): () => void
export function watch<T, T1, T2, T3, T4, T5>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>], callback: WatchCallback<[T, T1, T2, T3, T4, T5]>): () => void
export function watch<T, T1, T2, T3, T4, T5, T6>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>], callback: WatchCallback<[T, T1, T2, T3, T4, T5, T6]>): () => void
export function watch<T, T1, T2, T3, T4, T5, T6, T7>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>, Signal<T7>], callback: WatchCallback<[T, T1, T2, T3, T4, T5, T6, T7]>): () => void
export function watch<T>(deps: () => T, callback: WatchCallback<T>): () => void
export function watch<T = any>(deps: Signal<any>[], callback: WatchCallback<T[]>): () => void
/* eslint-enable max-len*/
export function watch(deps: Signal<any> | Signal<any>[] | (() => any), callback: WatchCallback<any>) {
  let prevFn: (() => any) | void
  const isArray = Array.isArray(deps)

  const effect = new Listener(function () {
    if (prevFn) {
      prevFn()
    }
    const newValue = isArray ? deps.map(fn => fn()) : deps()
    prevFn = callback(newValue, oldValue)
    oldValue = newValue
  })

  pushListener(effect)
  let oldValue = isArray ? deps.map(fn => fn()) : deps()
  popListener()
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

function registryComponentDestroyCallback(fn: () => void) {
  const component = getSetupContext(false)
  if (component) {
    if (!component.unmountedCallbacks) {
      component.unmountedCallbacks = []
    }
    component.unmountedCallbacks.push(fn)
  }
}
