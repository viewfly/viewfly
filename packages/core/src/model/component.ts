import {
  Injector,
  normalizeProvider,
  Provider,
  ReflectiveInjector,
  AbstractType,
  Type,
  InjectionToken,
  InjectFlags
} from '@tanbo/di'
import { Observable, Subject } from '@tanbo/stream'

import { ComponentFactory, JSXConfig, Props } from './jsx-element'
import { makeError } from '../_utils/make-error'

const contextStack: Component[] = []
const componentErrorFn = makeError('component')

function getComponentContext(need = true) {
  const current = contextStack[contextStack.length - 1]
  if (!current && need) {
    throw componentErrorFn('cannot be called outside the component!')
  }
  return current
}


export interface LifeCycleCallback {
  (): void
}

export class Component extends ReflectiveInjector {
  onChange: Observable<void>
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

  private changeEvent = new Subject<void>()
  private parentComponent: Component | null

  constructor(public factory: ComponentFactory,
              public config: JSXConfig<any> | null) {
    super(getComponentContext(false) || null, [])
    this.props = new Props(config)
    this.parentComponent = this.parentInjector as Component
    this.onChange = this.changeEvent.asObservable()
  }

  addProvide<T>(providers: Provider<T> | Provider<T>[]) {
    providers = Array.isArray(providers) ? providers : [providers]
    providers.forEach(p => {
      this.normalizedProviders.push(normalizeProvider(p))
    })
  }

  setup() {
    contextStack.push(this)
    const render = this.factory(this.config || {})
    const template = render()
    contextStack.pop()
    this.rendered()
    Promise.resolve().then(() => {
      this.invokeMountHooks()
    })
    return {
      template,
      render: () => {
        contextStack.push(this)
        const template = render()
        contextStack.pop()
        Promise.resolve().then(() => {
          this.invokeUpdatedHooks()
        })
        this.rendered()
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
    this._dirty = this._changed = false
  }

  invokeMountHooks() {
    for (const fn of this.mountCallbacks) {
      const destroyFn = fn()
      if (typeof destroyFn === 'function') {
        this.destroyCallbacks.push(destroyFn)
      }
    }
  }

  invokeUpdatedHooks() {
    for (const fn of this.updatedCallbacks) {
      fn()
    }
  }

  invokePropsChangedHooks(newProps: JSXConfig<any> | null) {
    const oldProps = this.config
    this.config = newProps
    for (const fn of this.propsChangedCallbacks) {
      fn(newProps, oldProps)
    }
  }

  destroy() {
    for (const fn of this.destroyCallbacks) {
      fn()
    }
    this.updatedCallbacks = []
    this.mountCallbacks = []
    this.updatedCallbacks = []
  }
}

export interface MountCallback {
  (): void | (() => void)
}

export interface PropsChangedCallback<T extends JSXConfig<any>> {
  (currentProps: T | null, oldProps: T | null): void
}

export function onMount(callback: MountCallback) {
  const component = getComponentContext()
  component.mountCallbacks.push(callback)
}

export function onUpdated(callback: LifeCycleCallback) {
  const component = getComponentContext()
  component.updatedCallbacks.push(callback)
}

export function onPropsChanged<T extends JSXConfig<any>>(callback: PropsChangedCallback<T>) {
  const component = getComponentContext()
  component.propsChangedCallbacks.push(callback)
}

export function onDestroy(callback: LifeCycleCallback) {
  const component = getComponentContext()
  component.destroyCallbacks.push(callback)
}

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
   * 更新组件状态的方法，可以传入最新的值，或者传入一个函数，并返回最新的值
   * @param newState
   */
  set(newState: T | ((oldState: T) => T)): void
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
  const component = getComponentContext()

  function stateManager() {
    return state
  }

  stateManager.set = function (newState: T) {
    if (typeof newState === 'function') {
      newState = newState(state)
    }
    if (newState === state) {
      return
    }
    state = newState
    component.markAsDirtied()
  }

  return stateManager
}

/**
 * 通过 IoC 容器当前组件提供上下文共享数据的方法
 * @param provider
 */
export function provide<T = any>(provider: Provider<T> | Provider<T>[]): Injector {
  const component = getComponentContext()
  component.addProvide(provider)
  return component
}

/**
 * 通过组件上下文获取 IoC 容器内数据的勾子方法
 */
export function inject<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T {
  const component = getComponentContext()
  if (!component) {
    throw componentErrorFn('only one unique injector is allowed for a component!')
  }
  return component.get(token, notFoundValue, flags)
}
