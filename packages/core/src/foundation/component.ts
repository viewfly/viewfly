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

import { Key, Props } from './jsx-element'
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
export class Component extends ReflectiveInjector {
  instance!: JSXInternal.ComponentInstance<Props>
  template: JSXInternal.ViewNode

  changedSubComponents = new Set<Component>()

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  $$view!: ComponentView
  unmountedCallbacks?: LifeCycleCallback[] | null
  mountCallbacks?: LifeCycleCallback[] | null
  propsChangedCallbacks?: PropsChangedCallback<any>[] | null
  updatedCallbacks?: LifeCycleCallback[] | null
  private updatedDestroyCallbacks?: Array<() => void> | null
  private propsChangedDestroyCallbacks?: Array<() => void> | null

  protected _dirty = true
  protected _changed = true

  private unWatch?: () => void

  private isFirstRendering = true

  private refs: DynamicRef<any>[] | null = null

  constructor(private readonly parentComponent: Injector | null,
              public readonly type: JSXInternal.ComponentSetup,
              public props: Props,
              public readonly key?: Key) {
    super(parentComponent, [], type.scope)
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
    const refs = toRefs(this.props.ref)
    if (refs.length) {
      this.refs = refs
      onMounted(() => {
        for (const ref of refs) {
          ref.bind(this.instance)
        }
        return () => {
          for (const ref of refs) {
            ref.unBind(this.instance)
          }
        }
      })
    }
    isSetup = false
    componentSetupStack.pop()

    signalDepsStack.push([])
    const template = this.instance.$render()
    const deps = signalDepsStack.pop()!
    this.unWatch = watch(Array.from(new Set(deps)), () => {
      this.markAsDirtied()
    })
    this.template = template
    return {
      template: template,
      portalHost: this.instance.$portalHost
    }
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

    if (this.refs) {
      for (const oldRef of this.refs) {
        if (!newRefs.includes(oldRef)) {
          oldRef.unBind(this.instance)
        }
      }
    }
    for (const newRef of newRefs) {
      newRef.bind(this.instance)
    }
    if (newRefs.length) {
      this.refs = newRefs
    }
    if (!forceUpdate && typeof this.instance.$useMemo === 'function') {
      if (this.instance.$useMemo(newProps, oldProps)) {
        return this.template
      }
    }
    this.unWatch!()
    signalDepsStack.push([])
    this.template = this.instance.$render()
    const deps = signalDepsStack.pop()!
    this.unWatch = watch(Array.from(new Set(deps)), () => {
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
    const is = this.isFirstRendering
    this.isFirstRendering = false
    this._dirty = this._changed = false
    this.invokeUpdatedHooks()
    if (is) {
      this.invokeMountHooks()
    }
    if (this.changed) {
      Promise.resolve().then(() => {
        if (this.parentComponent instanceof Component) {
          this.parentComponent.markAsChanged(this)
        }
      })
    }
  }

  destroy() {
    this.unWatch!()
    this.updatedDestroyCallbacks?.forEach(fn => {
      fn()
    })
    this.propsChangedDestroyCallbacks?.forEach(fn => {
      fn()
    })
    this.unmountedCallbacks?.forEach(fn => {
      fn()
    })
    this.propsChangedDestroyCallbacks =
      this.updatedDestroyCallbacks =
        this.mountCallbacks =
          this.updatedCallbacks =
            this.propsChangedCallbacks =
              this.unmountedCallbacks = null
  }

  private invokePropsChangedHooks(newProps: Props) {
    const oldProps = this.props
    this.props = newProps
    if (this.propsChangedCallbacks) {
      if (this.propsChangedDestroyCallbacks) {
        this.propsChangedDestroyCallbacks.forEach(fn => {
          fn()
        })
      }
      const propsChangedDestroyCallbacks: Array<() => void> = []
      for (const fn of this.propsChangedCallbacks) {
        const destroyFn = fn(newProps, oldProps)
        if (typeof destroyFn === 'function') {
          propsChangedDestroyCallbacks.push(destroyFn)
        }
      }
      this.propsChangedDestroyCallbacks = propsChangedDestroyCallbacks.length ? propsChangedDestroyCallbacks : null
    }
  }

  private invokeMountHooks() {
    const unmountedCallbacks: Array<() => void> = []
    if (this.mountCallbacks) {
      for (const fn of this.mountCallbacks) {
        const destroyFn = fn()
        if (typeof destroyFn === 'function') {
          unmountedCallbacks.push(destroyFn)
        }
      }
    }
    if (unmountedCallbacks.length) {
      this.unmountedCallbacks = unmountedCallbacks
    }
    this.mountCallbacks = null
  }

  private invokeUpdatedHooks() {
    if (this.updatedCallbacks) {
      if (this.updatedDestroyCallbacks) {
        this.updatedDestroyCallbacks.forEach(fn => {
          fn()
        })
      }
      const updatedDestroyCallbacks: Array<() => void> = []
      for (const fn of this.updatedCallbacks) {
        const destroyFn = fn()
        if (typeof destroyFn === 'function') {
          updatedDestroyCallbacks.push(destroyFn)
        }
      }
      this.updatedDestroyCallbacks = updatedDestroyCallbacks.length ? updatedDestroyCallbacks : null
    }
  }
}

function toRefs(ref: any): DynamicRef<any>[] {
  return (Array.isArray(ref) ? ref : [ref]).filter(i => {
    return i instanceof DynamicRef
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
  if (!component.mountCallbacks) {
    component.mountCallbacks = []
  }
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
  if (!component.updatedCallbacks) {
    component.updatedCallbacks = []
  }
  component.updatedCallbacks.push(callback)
  return () => {
    const index = component.updatedCallbacks!.indexOf(callback)
    if (index > -1) {
      component.updatedCallbacks!.splice(index, 1)
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
  if (!component.propsChangedCallbacks) {
    component.propsChangedCallbacks = []
  }
  component.propsChangedCallbacks.push(callback)
  return () => {
    const index = component.propsChangedCallbacks!.indexOf(callback)
    if (index > -1) {
      component.propsChangedCallbacks!.splice(index, 1)
    }
  }
}

/**
 * 当组件销毁时调用回调函数
 * @param callback
 */
export function onUnmounted(callback: () => void) {
  const component = getSetupContext()
  if (!component.unmountedCallbacks) {
    component.unmountedCallbacks = []
  }
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

export class DynamicRef<T> {
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
 *   const ref = createDynamicRef(node => {
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
export function createDynamicRef<T, U = ExtractInstanceType<T>>(callback: RefListener<U>) {
  return new DynamicRef<U>(callback)
}

const initValue = {}

export class StaticRef<T> extends DynamicRef<T> {
  readonly current!: T | null

  constructor() {
    let value: any = initValue
    let isInit = false
    super(v => {
      if (v !== initValue && !isInit) {
        value = v
        isInit = true
      }
    })

    Object.defineProperty(this, 'current', {
      get() {
        if (value === initValue) {
          return null
        }
        return value
      }
    })
  }
}

export function createRef<T, U = ExtractInstanceType<T>>() {
  return new StaticRef<U>()
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
export function createDerived<T>(callback: () => T, isContinue?: (data: T) => unknown): Signal<T> {
  const { data, deps } = invokeDepFn<T>(callback)
  const signal = createSignal<T>(data)
  const component = getSetupContext(false)

  const unListen = listen(signal, deps, callback, isContinue)

  if (component) {
    if (!component.unmountedCallbacks) {
      component.unmountedCallbacks = []
    }
    component.unmountedCallbacks.push(() => {
      unListen()
    })
  }
  return signal
}

export interface WatchCallback<T, U> {
  (newValue: T, oldValue: U): void | (() => void)
}

/**
 * 监听状态变化，当任意一个状态发生变更时，触发回调。
 * watch 会返回一个取消监听的函数，调用此函数，可以取消监听。
 * 当在组件中调用时，组件销毁时会自动取消监听。
 * @param deps 依赖的状态 Signal，可以是一个 Signal，只可以一个数包含 Signal 的数组，或者是一个求值函数
 * @param callback 状态变更后的回调函数
 */

/* eslint-disable max-len*/
export function watch<T>(deps: Signal<T>, callback: WatchCallback<T, T>): () => void
export function watch<T>(deps: [Signal<T>], callback: WatchCallback<[T], [T]>): () => void
export function watch<T, T1>(deps: [Signal<T>, Signal<T1>], callback: WatchCallback<[T, T1], [T, T1]>): () => void
export function watch<T, T1, T2>(deps: [Signal<T>, Signal<T1>, Signal<T2>], callback: WatchCallback<[T, T1, T2], [T, T1, T2]>): () => void
export function watch<T, T1, T2, T3>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>], callback: WatchCallback<[T, T1, T2, T3], [T, T1, T2, T3]>): () => void
export function watch<T, T1, T2, T3, T4>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>], callback: WatchCallback<[T, T1, T2, T3, T4], [T, T1, T2, T3, T4]>): () => void
export function watch<T, T1, T2, T3, T4, T5>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>], callback: WatchCallback<[T, T1, T2, T3, T4, T5], [T, T1, T2, T3, T4, T5]>): () => void
export function watch<T, T1, T2, T3, T4, T5, T6>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>], callback: WatchCallback<[T, T1, T2, T3, T4, T5, T6], [T, T1, T2, T3, T4, T5, T6]>): () => void
export function watch<T, T1, T2, T3, T4, T5, T6, T7>(deps: [Signal<T>, Signal<T1>, Signal<T2>, Signal<T3>, Signal<T4>, Signal<T5>, Signal<T6>, Signal<T7>], callback: WatchCallback<[T, T1, T2, T3, T4, T5, T6, T7], [T, T1, T2, T3, T4, T5, T6, T7]>): () => void
export function watch<T>(deps: () => T, callback: WatchCallback<T, T>): () => void
export function watch<T = any>(deps: Signal<any>[], callback: WatchCallback<T[], T[]>): () => void
/* eslint-enable max-len*/
export function watch(deps: Signal<any> | Signal<any>[] | (() => any), callback: WatchCallback<any, any>) {
  if (typeof deps === 'function' && !(deps as Signal<any>).$isSignal) {
    deps = createDerived(deps)
  }
  const signals = Array.isArray(deps) ? deps : [deps]
  let oldValues = signals.map(s => s())
  let prevCleanup: void | (() => void)

  function effectCallback() {
    if (typeof prevCleanup === 'function') {
      prevCleanup()
    }
    const newValues = signals.map(s => s())
    prevCleanup = Array.isArray(deps) ? callback(newValues, oldValues) : callback(newValues[0], oldValues[0])
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
    if (component?.unmountedCallbacks) {
      const index = component.unmountedCallbacks.indexOf(destroyFn)
      component.unmountedCallbacks.splice(index, 1)
    }
    for (const dep of signals) {
      dep[depsKey].delete(effectCallback)
    }
  }
  if (component) {
    if (!component.unmountedCallbacks) {
      component.unmountedCallbacks = []
    }
    component.unmountedCallbacks.push(destroyFn)
  }

  return destroyFn
}

/**
 * 通过 IoC 容器当前组件提供上下文共享数据的方法
 * @param provider
 */
export function provide(provider: Provider | Provider[]) {
  const component = getSetupContext()
  component.provide(provider)
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

/**
 * 获取当前组件实例
 */
export function getCurrentInstance(): Component {
  return getSetupContext()
}
