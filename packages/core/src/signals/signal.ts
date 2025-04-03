import { Dep, getDepContext } from '../base/dep'

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
  const subscribers = new Set<Dep>()

  function signal() {
    const listener = getDepContext()
    if (listener && !subscribers.has(listener)) {
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

