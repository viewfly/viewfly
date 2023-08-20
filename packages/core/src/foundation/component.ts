import {
  AbstractType,
  InjectFlags,
  InjectionToken,
  Injector,
  normalizeProvider,
  Provider,
  ReflectiveInjector,
  THROW_IF_NOT_FOUND,
  Type
} from '../di/_api'

import { JSXTypeof, Key, Props } from './jsx-element'
import { makeError } from '../_utils/make-error'
import { ComponentView, getArrayChanges, getObjectChanges } from './_utils'
import { JSXInternal } from './types'

const componentSetupStack: Component[] = []
const signalDepsStack: Signal<any>[][] = []
const componentErrorFn = makeError('component')

function getSetupContext(need = true) {
  const current = componentSetupStack[componentSetupStack.length - 1]
  if (!current && need) {
    // 防止因外部捕获异常引引起的缓存未清理的问题
    throw componentErrorFn('cannot be called outside the component!')
  }
  return current
}

function getSignalDepsContext() {
  return signalDepsStack[signalDepsStack.length - 1]
}

/**
 * Viewfly 组件管理类，用于管理组件的生命周期，上下文等
 */
export class Component extends ReflectiveInjector implements JSXTypeof<JSXInternal.ComponentSetup> {
  $$typeOf = this.type

  instance!: JSXInternal.ComponentInstance<Props>
  template: JSXInternal.JSXNode

  changedSubComponents = new Set<Component>()

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  $$view!: ComponentView
  unmountedCallbacks: LifeCycleCallback[] = []
  mountCallbacks: LifeCycleCallback[] = []
  propsChangedCallbacks: PropsChangedCallback<any>[] = []
  updatedCallbacks: LifeCycleCallback[] = []
  private updatedDestroyCallbacks: Array<() => void> = []
  private propsChangedDestroyCallbacks: Array<() => void> = []

  protected _dirty = true
  protected _changed = true

  private unWatch?: () => void

  private isFirstRending = true

  private refs!: Ref<any>[]

  constructor(private parentComponent: Injector | null,
              public type: JSXInternal.ComponentSetup,
              public props: Props,
              public key?: Key) {
    super(parentComponent, [{
      provide: Injector,
      useFactory: () => this
    }])
  }

  markAsDirtied() {
    this._dirty = true
    this.markAsChanged()
  }

  markAsChanged(changedComponent?: Component) {
    if (changedComponent) {
      this.changedSubComponents.add(changedComponent)
    }
    if (this._changed) {
      return
    }
    this._changed = true
    if (this.parentComponent instanceof Component) {
      this.parentComponent.markAsChanged(this)
    }
  }

  render() {
    const self = this
    const proxiesProps = new Proxy(this.props, {
      get(_, key) {
        // 必须用 self，因为 props 会随着页面更新变更，使用 self 才能更新引用
        return self.props[key]
      },
      set() {
        // 防止因外部捕获异常引引起的缓存未清理的问题
        if (isSetup) {
          componentSetupStack.pop()
        }
        throw componentErrorFn('component props is readonly!')
      }
    })

    componentSetupStack.push(this)
    let isSetup = true
    const render = this.type(proxiesProps)
    const isRenderFn = typeof render === 'function'
    this.instance = isRenderFn ? { $render: render } : render
    this.refs = toRefs(this.props.ref)
    this.mountCallbacks.push(() => {
      for (const ref of this.refs) {
        ref.bind(this.instance)
      }
    })
    this.unmountedCallbacks.push(() => {
      for (const ref of this.refs) {
        ref.unBind(this.instance)
      }
    })
    isSetup = false
    componentSetupStack.pop()

    signalDepsStack.push([])
    const template = this.instance.$render()
    const deps = signalDepsStack.pop()!
    this.unWatch = useEffect(Array.from(new Set(deps)), () => {
      this.markAsDirtied()
    })
    this.template = template
    return template
  }

  update(newProps: Props, forceUpdate = false) {
    const oldProps = this.props
    const {
      add,
      remove,
      replace
    } = getObjectChanges(newProps, this.props)
    if (add.length || remove.length || replace.length) {
      this.invokePropsChangedHooks(newProps)
    } else if (!this.dirty) {
      return this.template
    }

    const newRefs = toRefs(newProps.ref)

    for (const oldRef of this.refs) {
      if (!newRefs.includes(oldRef)) {
        oldRef.unBind(this.instance)
      }
    }
    for (const newRef of newRefs) {
      if (!this.refs.includes(newRef)) {
        newRef.bind(this.instance)
      }
    }
    this.refs = newRefs
    if (!forceUpdate && typeof this.instance.$useMemo === 'function') {
      if (this.instance.$useMemo(newProps, oldProps)) {
        return this.template
      }
    }
    this.unWatch!()
    signalDepsStack.push([])
    this.template = this.instance.$render()
    const deps = signalDepsStack.pop()!
    this.unWatch = useEffect(Array.from(new Set(deps)), () => {
      this.markAsDirtied()
    })
    return this.template
  }

  provide<T>(providers: Provider<T> | Provider<T>[]) {
    providers = Array.isArray(providers) ? providers : [providers]
    this.normalizedProviders.unshift(...providers.map(i => normalizeProvider(i)))
  }

  rendered() {
    this.changedSubComponents.clear()
    const is = this.isFirstRending
    this.isFirstRending = false
    this._dirty = this._changed = false
    if (is) {
      this.invokeUpdatedHooks()
      this.invokeMountHooks()
    } else {
      this.invokeUpdatedHooks()
    }
  }

  destroy() {
    this.unWatch!()
    this.updatedDestroyCallbacks.forEach(fn => {
      fn()
    })
    this.updatedDestroyCallbacks = []

    this.propsChangedDestroyCallbacks.forEach(fn => {
      fn()
    })
    this.propsChangedDestroyCallbacks = []

    for (const fn of this.unmountedCallbacks) {
      fn()
    }
    this.mountCallbacks = []
    this.updatedCallbacks = []
    this.propsChangedCallbacks = []
    this.unmountedCallbacks = []
  }

  private invokePropsChangedHooks(newProps: Props) {
    const oldProps = this.props
    this.props = newProps

    this.propsChangedDestroyCallbacks.forEach(fn => {
      fn()
    })
    this.propsChangedDestroyCallbacks = []
    for (const fn of this.propsChangedCallbacks) {
      const destroyFn = fn(newProps, oldProps)
      if (typeof destroyFn === 'function') {
        this.propsChangedDestroyCallbacks.push(destroyFn)
      }
    }
  }

  private invokeMountHooks() {
    for (const fn of this.mountCallbacks) {
      const destroyFn = fn()
      if (typeof destroyFn === 'function') {
        this.unmountedCallbacks.push(destroyFn)
      }
    }
  }

  private invokeUpdatedHooks() {
    this.updatedDestroyCallbacks.forEach(fn => {
      fn()
    })
    this.updatedDestroyCallbacks = []
    for (const fn of this.updatedCallbacks) {
      const destroyFn = fn()
      if (typeof destroyFn === 'function') {
        this.updatedDestroyCallbacks.push(destroyFn)
      }
    }
  }
}

function toRefs(ref: any): Ref<any>[] {
  return (Array.isArray(ref) ? ref : [ref]).filter(i => {
    return i instanceof Ref
  })
}

export interface LifeCycleCallback {
  (): void | (() => void)
}

export interface PropsChangedCallback<T extends Props> {
  (currentProps: T | null, oldProps: T | null): void | (() => void)
}

/**
 * 当组件第一次渲染完成时触发
 * @param callback
 * ```tsx
 * function App() {
 *   onMount(() => {
 *     console.log('App mounted!')
 *   })
 *   return () => <div>...</div>
 * }
 * ```
 */
export function onMounted(callback: LifeCycleCallback) {
  const component = getSetupContext()
  component.mountCallbacks.push(callback)
}

/**
 * 当组件视图更新后调用
 * @param callback
 * ```tsx
 * function App() {
 *   onUpdated(() => {
 *     console.log('App updated!')
 *     return () => {
 *       console.log('destroy prev update!')
 *     }
 *   })
 *   return () => <div>...</div>
 * }
 * ```
 */
export function onUpdated(callback: LifeCycleCallback) {
  const component = getSetupContext()
  component.updatedCallbacks.push(callback)
  return () => {
    const index = component.updatedCallbacks.indexOf(callback)
    if (index > -1) {
      component.updatedCallbacks.splice(index, 1)
    }
  }
}

/**
 * 当组件 props 更新地调用
 * @param callback
 * @example
 * ```tsx
 * function YourComponent(props) {
 *   onPropsChanged((currentProps, prevProps) => {
 *     console.log(currentProps, prevProps)
 *
 *     return () => {
 *       console.log('destroy prev changed!')
 *     }
 *   })
 *   return () => {
 *     return <div>xxx</div>
 *   }
 * }
 * ```
 */
export function onPropsChanged<T extends Props>(callback: PropsChangedCallback<T>) {
  const component = getSetupContext()
  component.propsChangedCallbacks.push(callback)
  return () => {
    const index = component.propsChangedCallbacks.indexOf(callback)
    if (index > -1) {
      component.propsChangedCallbacks.splice(index, 1)
    }
  }
}

/**
 * 当组件销毁时调用回调函数
 * @param callback
 */
export function onUnmounted(callback: () => void) {
  const component = getSetupContext()
  component.unmountedCallbacks.push(callback)
}

export interface RefListener<T> {
  (current: T): void | (() => void)
}

export type ExtractInstanceType<
  T,
  U = T extends (...args: any) => any ? ReturnType<T> : T
> = U extends JSXInternal.ComponentInstance<any> ? Omit<U, keyof JSXInternal.ComponentInstance<any>> : U extends Function ? never : T

export interface AbstractInstanceType<T extends Record<string, any>> {
  (): T & JSXInternal.ComponentInstance<any>
}

export class Ref<T> {
  private unBindMap = new Map<T, () => void>()
  private targetCaches = new Set<T>()

  constructor(private callback: RefListener<T>) {
  }

  bind(value: T) {
    if (typeof value !== 'object' || value === null) {
      return
    }
    if (this.targetCaches.has(value)) {
      return
    }
    const unBindFn = this.callback(value)
    if (typeof unBindFn === 'function') {
      this.unBindMap.set(value, unBindFn)
    }
    this.targetCaches.add(value)
  }

  unBind(value: T) {
    this.targetCaches.delete(value)
    const unBindFn = this.unBindMap.get(value)
    this.unBindMap.delete(value)
    if (typeof unBindFn === 'function') {
      unBindFn()
    }
  }
}

/**
 * 用于节点渲染完成时获取 DOM 节点
 * @param callback 获取 DOM 节点的回调函数
 * @example
 * ```tsx
 * function App() {
 *   const ref = useRef(node => {
 *     function fn() {
 *       // do something...
 *     }
 *     node.addEventListener('click', fn)
 *     return () => {
 *       node.removeEventListener('click', fn)
 *     }
 *   })
 *   return () => {
 *     return <div ref={ref}>xxx</div>
 *   }
 * }
 * ```
 */
export function useRef<T, U = ExtractInstanceType<T>>(callback: RefListener<U>) {
  return new Ref<U>(callback)
}

const depsKey = Symbol('deps')

/**
 * 组件状态实例，直接调用可以获取最新的状态，通过 set 方法可以更新状态
 * ```
 */
export interface Signal<T> {
  $isSignal: true

  /**
   *  直接调用一个 Signal 实例，可以获取最新状态
   */
  (): T

  /**
   * 更新组件状态的方法，可以传入最新的值
   * @param newState
   */
  set(newState: T): void

  [depsKey]: Set<LifeCycleCallback>
}

/**
 * 组件状态管理器
 * @param state 初始状态
 * @example
 * ```tsx
 * function App() {
 *   // 初始化状态
 *   const state = useSignal(1)
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
export function useSignal<T>(state: T): Signal<T> {
  function signal() {
    const depsContext = getSignalDepsContext()
    if (depsContext) {
      depsContext.push(signal)
    }
    return state
  }

  signal.$isSignal = true as const

  signal.set = function (newState: T) {
    if (newState === state) {
      return
    }
    state = newState
    const depCallbacks = Array.from(signal[depsKey])
    for (const fn of depCallbacks) {
      // 回调中可能会对依赖做出修改，故需先缓存起来
      fn()
    }
  }
  //
  // signal.toString = function () {
  //   return String(state)
  // }
  //
  // signal.valueOf = function () {
  //   return state
  // }

  signal[depsKey] = new Set<LifeCycleCallback>()

  return signal
}

function invokeDepFn<T>(fn: () => T) {
  const deps: Signal<T>[] = []
  signalDepsStack.push(deps)
  const data = fn()
  signalDepsStack.pop()
  return {
    deps: Array.from(new Set(deps)),
    data
  }
}

function listen<T>(model: Signal<T>, deps: Signal<T>[], callback: () => T, isContinue?: (data: T) => unknown) {
  let isStop = false
  const nextListen = () => {
    if (isStop) {
      return
    }
    isStop = true
    const { data: nextData, deps: nextDeps } = invokeDepFn(callback)
    model.set(nextData)
    if (typeof isContinue === 'function' && isContinue(nextData) === false) {
      unListen()
      return
    }
    const changes = getArrayChanges<Signal<T>>(deps, nextDeps)
    deps = deps.filter(i => {
      const has = changes.remove.includes(i)
      if (has) {
        i[depsKey].delete(nextListen)
        return false
      }
      return true
    })
    for (const s of changes.add) {
      s[depsKey].add(nextListen)
    }
    deps.push(...changes.add)
    isStop = false
  }
  const unListen = () => {
    for (const s of deps) {
      s[depsKey].delete(nextListen)
    }
  }
  for (const s of deps) {
    s[depsKey].add(nextListen)
  }

  return unListen
}

/**
 * 使用派生值，Viewfly 会收集回调函数内同步执行时访问的 Signal，
 * 并在你获取 useDerived 函数返回的 Signal 的值时，自动计算最新的值。
 *
 * @param callback
 * @param isContinue 可选的停止函数，在每次值更新后调用，当返回值为 false 时，将不再监听依赖的变化
 */
export function useDerived<T>(callback: () => T, isContinue?: (data: T) => unknown): Signal<T> {
  const { data, deps } = invokeDepFn<T>(callback)
  const signal = useSignal<T>(data)
  const component = getSetupContext(false)

  const unListen = listen(signal, deps, callback, isContinue)

  if (component) {
    component.unmountedCallbacks.push(() => {
      unListen()
    })
  }
  return signal
}

export interface EffectCallback<T, U> {
  (newValue: T, oldValue: U): void | (() => void)
}

/**
 * 监听状态变化，当任意一个状态发生变更时，触发回调。
 * useEffect 会返回一个取消监听的函数，调用此函数，可以取消监听。
 * 当在组件中调用时，组件销毁时会自动取消监听。
 * @param deps 依赖的状态 Signal，可以是一个 Signal，只可以一个数包含 Signal 的数组，或者是一个求值函数
 * @param effect 状态变更后的回调函数
 */

/* eslint-disable max-len*/
export function useEffect<T>(deps: Signal<T>, effect: EffectCallback<T, T>): () => void
export function useEffect<T>(deps: [Signal<T>], effect: EffectCallback<[T], [T]>): () => void
export function useEffect<T, T1>(deps: [Signal<T>, Signal<T1>], effect: EffectCallback<[T, T1], [T, T1]>): () => void
export function useEffect<T, T1, T2>(deps: [Signal<T>, Signal<T1>, Signal<T2>], effect: EffectCallback<[T, T1, T2], [T, T1, T2]>): () => void
export function useEffect<T, T1, T2, T3>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>], effect: EffectCallback<[T, T1, T2, T3], [T, T1, T2, T3]>): () => void
export function useEffect<T, T1, T2, T3, T4>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>], effect: EffectCallback<[T, T1, T2, T3, T4], [T, T1, T2, T3, T4]>): () => void
export function useEffect<T, T1, T2, T3, T4, T5>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>], effect: EffectCallback<[T, T1, T2, T3, T4, T5], [T, T1, T2, T3, T4, T5]>): () => void
export function useEffect<T, T1, T2, T3, T4, T5, T6>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>], effect: EffectCallback<[T, T1, T2, T3, T4, T5, T6], [T, T1, T2, T3, T4, T5, T6]>): () => void
export function useEffect<T, T1, T2, T3, T4, T5, T6, T7>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>, Signal<T7>], effect: EffectCallback<[T, T1, T2, T3, T4, T5, T6, T7], [T, T1, T2, T3, T4, T5, T6, T7]>): () => void
export function useEffect<T>(deps: () => T, effect: EffectCallback<T, T>): () => void
export function useEffect<T = any>(deps: Signal<any>[], effect: EffectCallback<T[], T[]>): () => void
/* eslint-enable max-len*/
export function useEffect(deps: Signal<any> | Signal<any>[] | (() => any), effect: EffectCallback<any, any>) {
  if (typeof deps === 'function' && !(deps as Signal<any>).$isSignal) {
    deps = useDerived(deps)
  }
  const signals = Array.isArray(deps) ? deps : [deps]
  let oldValues = signals.map(s => s())
  let prevCleanup: void | (() => void)

  function effectCallback() {
    if (typeof prevCleanup === 'function') {
      prevCleanup()
    }
    const newValues = signals.map(s => s())
    prevCleanup = Array.isArray(deps) ? effect(newValues, oldValues) : effect(newValues[0], oldValues[0])
    oldValues = newValues
  }

  for (const dep of signals) {
    dep[depsKey].add(effectCallback)
  }

  const component = getSetupContext(false)
  let isClean = false
  const destroyFn = () => {
    if (isClean) {
      return
    }
    isClean = true
    if (component) {
      const index = component.unmountedCallbacks.indexOf(destroyFn)
      component.unmountedCallbacks.splice(index, 1)
    }
    for (const dep of signals) {
      dep[depsKey].delete(effectCallback)
    }
  }
  if (component) {
    component.unmountedCallbacks.push(destroyFn)
  }

  return destroyFn
}

/**
 * 通过 IoC 容器当前组件提供上下文共享数据的方法
 * @param provider
 */
export function provide(provider: Provider | Provider[]): Component {
  const component = getSetupContext()
  component.provide(provider)
  return component
}

/**
 * 通过组件上下文获取 IoC 容器内数据的勾子方法
 */
export function inject<T>(
  token: Type<T> | AbstractType<T> | InjectionToken<T>,
  notFoundValue = THROW_IF_NOT_FOUND as T,
  flags = InjectFlags.SkipSelf): T {
  const component = getSetupContext()
  return component.get(token, notFoundValue, flags)
}
