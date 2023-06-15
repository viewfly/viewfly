import {
  normalizeProvider,
  Provider,
  ReflectiveInjector,
  AbstractType,
  Type,
  InjectionToken,
  InjectFlags,
  Injector
} from '@tanbo/di'

import { JSXProps, JSXElement, Props } from './jsx-element'
import { makeError } from '../_utils/make-error'

const componentSetupStack: Component[] = []
const componentRendingStack: Component[] = []
const componentErrorFn = makeError('component')

function getSetupContext(need = true) {
  const current = componentSetupStack[componentSetupStack.length - 1]
  if (!current && need) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return current
}

function getRendingContext() {
  return componentRendingStack[componentRendingStack.length - 1]
}

export class JSXComponent {
  constructor(public createInstance: (injector: Component) => Component) {
  }
}

export type JSXTemplate = JSXElement | JSXComponent | null | void

export interface ComponentSetup {
  (props?: JSXProps<any>): () => JSXTemplate
}

/**
 * Viewfly 组件管理类，用于管理组件的生命周期，上下文等
 */
export class Component extends ReflectiveInjector {
  destroyCallbacks: LifeCycleCallback[] = []
  mountCallbacks: LifeCycleCallback[] = []
  propsChangedCallbacks: PropsChangedCallback<any>[] = []
  updatedCallbacks: LifeCycleCallback[] = []
  props: Props

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  protected _dirty = true
  protected _changed = true

  private parentComponent: Component | null

  private updatedDestroyCallbacks: Array<() => void> = []
  private propsChangedDestroyCallbacks: Array<() => void> = []

  private isFirstRending = true

  constructor(context: Injector,
              public setup: ComponentSetup,
              public config: JSXProps<any> | null) {
    super(context, [])
    this.props = new Props(config)
    this.parentComponent = this.parentInjector as Component
  }

  addProvide<T>(providers: Provider<T> | Provider<T>[]) {
    providers = Array.isArray(providers) ? providers : [providers]
    providers.forEach(p => {
      this.normalizedProviders.push(normalizeProvider(p))
    })
  }

  init() {
    const self = this
    const props = new Proxy(this.config || {}, {
      get(_, key) {
        if (self.config) {
          return self.config[key]
        }
      },
      set() {
        throw componentErrorFn('component props is readonly!')
      }
    })
    componentSetupStack.push(this)
    const render = this.setup(props)
    componentSetupStack.pop()
    componentRendingStack.push(this)
    const template = render()
    componentRendingStack.pop()
    return {
      template,
      render: () => {
        componentRendingStack.push(this)
        const template = render()
        componentRendingStack.pop()
        return template
      }
    }
  }

  markAsDirtied() {
    this._dirty = true
    this.markAsChanged()
  }

  markAsChanged() {
    this._changed = true
    this.parentComponent!.markAsChanged()
  }

  rendered() {
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

  invokePropsChangedHooks(newProps: JSXProps<any> | null) {
    const oldProps = this.config
    this.config = newProps

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

  destroy() {
    this.updatedDestroyCallbacks.forEach(fn => {
      fn()
    })
    this.updatedDestroyCallbacks = []

    this.propsChangedDestroyCallbacks.forEach(fn => {
      fn()
    })
    this.propsChangedDestroyCallbacks = []

    for (const fn of this.destroyCallbacks) {
      fn()
    }
    this.updatedCallbacks = []
    this.mountCallbacks = []
    this.updatedCallbacks = []
  }

  private invokeMountHooks() {
    for (const fn of this.mountCallbacks) {
      const destroyFn = fn()
      if (typeof destroyFn === 'function') {
        this.destroyCallbacks.push(destroyFn)
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

export interface LifeCycleCallback {
  (): void | (() => void)
}

export interface PropsChangedCallback<T extends JSXProps<any>> {
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
export function onMount(callback: LifeCycleCallback) {
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
export function onPropsChanged<T extends JSXProps<any>>(callback: PropsChangedCallback<T>) {
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
export function onDestroy(callback: () => void) {
  const component = getSetupContext()
  component.destroyCallbacks.push(callback)
}

export interface RefListener<T> {
  (current: T): void | (() => void)
}

export class Ref<T extends object> {
  private unBindMap = new WeakMap<T, () => void>
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
    this.targetCaches.add(value)
    const unBindFn = this.callback(value)
    if (typeof unBindFn === 'function') {
      this.unBindMap.set(value, unBindFn)
    }
  }

  unBind(value: T) {
    this.targetCaches.delete(value)
    const unBindFn = this.unBindMap.get(value)
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
export function useRef<T extends object>(callback: RefListener<T>) {
  return new Ref<T>(callback)
}

const depsKey = Symbol('deps')

/**
 * 组件状态实例，直接调用可以获取最新的状态，通过 set 方法可以更新状态
 * ```
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
  const usedComponents = new Set<Component>()

  function stateManager() {
    const component = getRendingContext()
    if (component && !usedComponents.has(component)) {
      usedComponents.add(component)
      component.destroyCallbacks.push(() => {
        usedComponents.delete(component)
      })
    }
    return state
  }

  stateManager.set = function (newState: T) {
    if (newState === state) {
      return
    }
    state = newState
    for (const component of usedComponents) {
      component.markAsDirtied()
    }
    for (const fn of stateManager[depsKey]) {
      fn()
    }
  }

  stateManager[depsKey] = new Set<LifeCycleCallback>()

  return stateManager
}

/**
 * 监听状态变化，当任意一个状态发生变更时，触发回调。
 * useEffect 会返回一个取消监听的函数，调用此函数，可以取消监听。
 * 当在组件中调用时，组件销毁时会自动取消监听。
 * @param deps 依赖的状态 Signal，可以是一个 Signal，只可以一个数包含 Signal 的数组
 * @param effect 状态变更后的回调函数
 */
export function useEffect(deps: Signal<any> | Signal<any>[], effect: LifeCycleCallback) {
  const signals = Array.isArray(deps) ? deps : [deps]
  let prevCleanup: void | (() => void)

  function effectCallback() {
    if (typeof prevCleanup === 'function') {
      prevCleanup()
    }
    prevCleanup = effect()
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
      const index = component.destroyCallbacks.indexOf(destroyFn)
      component.destroyCallbacks.splice(index, 1)
    }
    for (const dep of signals) {
      dep[depsKey].delete(effectCallback)
    }
  }
  if (component) {
    component.destroyCallbacks.push(destroyFn)
  }

  return destroyFn
}

/**
 * 通过 IoC 容器当前组件提供上下文共享数据的方法
 * @param provider
 */
export function provide(provider: Provider | Provider[]): Component {
  const component = getSetupContext()
  component.addProvide(provider)
  return component
}

/**
 * 通过组件上下文获取 IoC 容器内数据的勾子方法
 */
export function inject<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T {
  const component = getSetupContext()
  return component.parentInjector.get(token, notFoundValue, flags)
}
