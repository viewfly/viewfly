import {
  AbstractType,
  ExtractValueType,
  InjectFlags,
  InjectionToken,
  Injector,
  normalizeProvider,
  Provider,
  ReflectiveInjector, Scope,
  THROW_IF_NOT_FOUND,
  Type
} from '../di/_api'

import { Key, Props } from './jsx-element'
import { makeError } from '../_utils/make-error'
import { getObjectChanges } from './_utils'
import { NativeNode } from './injection-tokens'
import { JSX } from './types'
import { Listener, popListener, pushListener } from './listener'
import { LifeCycleCallback, onMounted, PropsChangedCallback } from './lifecycle'
import { DynamicRef } from './ref'

const componentSetupStack: Component[] = []
const componentErrorFn = makeError('component')

export function getSetupContext(need = true) {
  const current = componentSetupStack[componentSetupStack.length - 1]
  if (!current && need) {
    // 防止因外部捕获异常引引起的缓存未清理的问题
    throw componentErrorFn('cannot be called outside the component!')
  }
  return current
}

export type ClassNames = string | Record<string, unknown> | false | null | undefined | ClassNames[]

export interface ComponentInstance<P> {
  $portalHost?: NativeNode

  $render(): JSXNode

  $useMemo?(currentProps: P, prevProps: P): boolean
}

export type JSXNode =
  JSX.Element
  | JSX.ElementClass
  | string
  | number
  | boolean
  | null
  | undefined
  | Iterable<JSXNode>

export interface ComponentAnnotation {
  scope?: Scope
  providers?: Provider[]
}

export interface ComponentSetup<P = any> {
  (props: P): (() => JSXNode) | ComponentInstance<P>

  annotation?: ComponentAnnotation
}

function toRefs(ref: any): DynamicRef<any>[] {
  return (Array.isArray(ref) ? ref : [ref]).filter(i => {
    return i instanceof DynamicRef
  })
}

/**
 * Viewfly 组件管理类，用于管理组件的生命周期，上下文等
 */
export class Component extends ReflectiveInjector {
  instance!: ComponentInstance<Props>

  changedSubComponents = new Set<Component>()

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  // $$view!: ComponentView
  unmountedCallbacks?: LifeCycleCallback[] | null
  mountCallbacks?: LifeCycleCallback[] | null
  propsChangedCallbacks?: PropsChangedCallback<any>[] | null
  updatedCallbacks?: LifeCycleCallback[] | null
  private updatedDestroyCallbacks?: Array<() => void> | null
  private propsChangedDestroyCallbacks?: Array<() => void> | null

  protected _dirty = true
  protected _changed = true

  private isFirstRendering = true

  private refs: DynamicRef<any>[] | null = null
  private listener = new Listener(() => {
    this.markAsDirtied()
  })

  constructor(private readonly parentComponent: Injector | null,
              public readonly type: ComponentSetup,
              public props: Props,
              public readonly key?: Key) {
    const annotation = type.annotation || {}
    const providers = annotation.providers || []

    super(parentComponent, [...providers, {
      provide: Injector,
      useFactory: () => this
    }], annotation.scope)
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

  render(update: (template: JSXNode, portalHost?: NativeNode) => void) {
    const self = this
    const proxiesProps = new Proxy(this.props, {
      get(_, key) {
        // 必须用 self，因为 props 会随着页面更新变更，使用 self 才能更新引用
        return (self.props as Record<string | symbol, any>)[key]
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
    const refs = toRefs((this.props as Record<string, any>).ref)
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

    pushListener(this.listener)
    const template = this.instance.$render()

    popListener()
    update(template, this.instance.$portalHost)
    this.rendered()
  }

  update(newProps: Record<string, any>,
         updateChildren: (jsxNode: JSXNode) => void,
         reuseChildren: (skipSubComponentDiff: boolean) => void) {
    const oldProps = this.props
    if (newProps !== oldProps) {
      const {
        add,
        remove,
        replace
      } = getObjectChanges(newProps, oldProps)
      if (add.length || remove.length || replace.length) {
        this.invokePropsChangedHooks(newProps)
      } else if (!this.dirty) {
        this.props = newProps
        reuseChildren(false)
        this.rendered()
        return
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
    }
    if (typeof this.instance.$useMemo === 'function') {
      if (this.instance.$useMemo(newProps, oldProps)) {
        reuseChildren(true)
        this.rendered()
        return
      }
    }
    this.listener.destroy()
    pushListener(this.listener)
    const template = this.instance.$render()
    popListener()
    updateChildren(template)

    this.rendered()
  }

  provide<T>(providers: Provider<T> | Provider<T>[]) {
    providers = Array.isArray(providers) ? providers : [providers]
    this.normalizedProviders.unshift(...providers.map(i => normalizeProvider(i)))
  }

  destroy() {
    this.listener.destroy()
    this.updatedDestroyCallbacks?.forEach(fn => {
      fn()
    })
    this.propsChangedDestroyCallbacks?.forEach(fn => {
      fn()
    })
    this.unmountedCallbacks?.forEach(fn => {
      fn()
    })
    if (this.parentComponent instanceof Component) {
      this.parentComponent.changedSubComponents.delete(this)
    }
    (this as unknown as {parentComponent: any}).parentComponent =
      this.parentInjector =
        this.propsChangedDestroyCallbacks =
          this.updatedDestroyCallbacks =
            this.mountCallbacks =
              this.updatedCallbacks =
                this.propsChangedCallbacks =
                  this.unmountedCallbacks = null

    this.changedSubComponents.clear()
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
      if (this.unmountedCallbacks) {
        this.unmountedCallbacks.push(...unmountedCallbacks)
      } else {
        this.unmountedCallbacks = unmountedCallbacks
      }
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

/**
 * 给组件添加注解
 * @param annotation
 * @param componentSetup
 * @example
 * ```ts
 * export customScope = new Scope('scopeName')
 * export const App = withAnnotation({
 *   scope: customScope,
 *   providers: [
 *     ExampleService
 *   ]
 * }, function(props: Props) {
 *   return () => {
 *     return <div>...</div>
 *   }
 * })
 * ```
 */
export function withAnnotation<T extends ComponentSetup>(annotation: ComponentAnnotation, componentSetup: T): T {
  const setup: ComponentSetup = function setup(props: any) {
    return componentSetup(props)
  }
  setup.annotation = annotation
  return setup as T
}

/**
 * 通过组件上下文获取 IoC 容器内数据的勾子方法
 */
export function inject<T extends Type<any> | AbstractType<any> | InjectionToken<any>, U = never>(
  token: T,
  notFoundValue: U = THROW_IF_NOT_FOUND as U,
  flags?: InjectFlags,
): ExtractValueType<T> | U {
  const component = getSetupContext()
  return component.get(token, notFoundValue, flags)
}

/**
 * 获取当前组件实例
 */
export function getCurrentInstance(): Component {
  return getSetupContext()
}
