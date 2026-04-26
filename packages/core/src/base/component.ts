import { Key } from './jsx-element'
import { makeError } from '../_utils/make-error'
import { NativeNode } from './injection-tokens'
import { JSX, RefProp } from './types'
import { LifeCycleCallback, onMounted } from './lifecycle'
import { createShallowReadonlyProxy, internalWrite } from '../reactive/reactive'
import { comparePropsWithCallbacks } from './_utils'
import type { ComponentAtom } from './_utils'
import { Dep, popDepContext, pushDepContext } from './dep'
import { applyRefs, RefEffects, updateRefs } from './ref'

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

export interface ComponentInstance {
  portalContainer?: NativeNode

  render(): JSXNode
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

export interface ComponentSetup<P = any> {
  (props: P): (() => JSXNode) | ComponentInstance
}

export interface ComponentViewMetadata {
  atom: ComponentAtom
  container: NativeNode,
  isParent: boolean,
  rootContainer: NativeNode
}

/**
 * Viewfly 组件管理类，用于管理组件的生命周期，上下文等
 */
export class Component {
  declare readonly parentComponent: Component | null
  declare readonly type: ComponentSetup
  declare props: Record<string, any>
  declare readonly key?: Key
  declare instance: ComponentInstance

  declare changedSubComponents: Set<Component>

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }


  /**
   * @internal
   */
  declare viewMetadata: ComponentViewMetadata

  declare unmountedCallbacks?: LifeCycleCallback[] | null
  declare mountCallbacks?: LifeCycleCallback[] | null
  declare updatedCallbacks?: LifeCycleCallback[] | null
  declare private updatedDestroyCallbacks?: Array<() => void> | null

  declare protected _dirty: boolean
  declare protected _changed: boolean

  declare private isFirstRendering: boolean
  declare private rawProps: Record<string, any>

  declare private refEffects: RefEffects
  declare private listener: Dep

  constructor(parentComponent: Component | null,
              type: ComponentSetup,
              props: Record<string, any>,
              key?: Key) {
    this.parentComponent = parentComponent
    this.type = type
    this.props = props
    this.key = key
    this.instance = null as any
    this.changedSubComponents = new Set<Component>()
    this.viewMetadata = null as any
    this.unmountedCallbacks = null
    this.mountCallbacks = null
    this.updatedCallbacks = null
    this.updatedDestroyCallbacks = null
    this._dirty = true
    this._changed = false
    this.isFirstRendering = true
    this.rawProps = props
    this.props = createShallowReadonlyProxy({ ...props })
    this.refEffects = new Map<RefProp<any>, (() => void) | void>()
    this.listener = new Dep(() => {
      this.markAsDirtied()
    }, 'async')
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
    if (this.parentComponent) {
      this.parentComponent.markAsChanged(this)
    }
  }

  render(update: (template: JSXNode, portalContainer?: NativeNode) => void) {
    componentSetupStack.push(this)
    const render = this.type(this.props)
    const isRenderFn = typeof render === 'function'
    this.instance = isRenderFn ? { render } : render
    onMounted(() => {
      applyRefs((this.props as Record<string, any>).ref, this.instance, this.refEffects)

      return () => {
        this.refEffects.forEach(fn => {
          if (typeof fn === 'function') {
            fn()
          }
        })
      }
    })
    componentSetupStack.pop()

    pushDepContext(this.listener)
    const template = this.instance.render()

    popDepContext()
    update(template, this.instance.portalContainer)
    this.rendered()
  }

  updateProps(newProps: Record<string, any>) {
    const oldProps = this.rawProps
    this.rawProps = newProps
    const newRefs = newProps.ref
    comparePropsWithCallbacks(oldProps, newProps, key => {
      internalWrite(() => {
        Reflect.deleteProperty(oldProps, key)
      })
    }, (key, value) => {
      internalWrite(() => {
        this.props[key] = value
      })
    }, (key, value) => {
      internalWrite(() => {
        this.props[key] = value
      })
    })

    updateRefs(newRefs, this.instance, this.refEffects)
  }

  rerender() {
    this.listener.destroy()
    pushDepContext(this.listener)
    const template = this.instance.render()
    popDepContext()
    return template
  }

  destroy() {
    this.listener.destroy()
    if (this.updatedDestroyCallbacks) {
      this.updatedDestroyCallbacks.forEach(fn => {
        fn()
      })
    }
    if (this.unmountedCallbacks) {
      this.unmountedCallbacks.forEach(fn => {
        fn()
      })
    }
    (this as unknown as {parentComponent: any}).parentComponent =
      this.updatedDestroyCallbacks =
        this.mountCallbacks =
          this.updatedCallbacks =
            this.unmountedCallbacks = null
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
        if (this.parentComponent) {
          this.parentComponent!.markAsChanged(this)
        }
      })
    }
  }

  private invokeMountHooks() {
    const unmountedCallbacks: Array<() => void> = []
    if (this.mountCallbacks) {
      const len = this.mountCallbacks.length
      for (let i = 0; i < len; ++i) {
        const fn = this.mountCallbacks[i]
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
      const len = this.updatedCallbacks.length
      for (let i = 0; i < len; ++i) {
        const fn = this.updatedCallbacks[i]
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
 * 获取当前组件实例
 * @returns 当前组件实例
 * @example
 * ```tsx
 * function App() {
 *   const instance = getCurrentInstance()
 *   console.log(instance)
 *   return () => <div>...</div>
 * }
 * ```
 */
export function getCurrentInstance(): Component {
  return getSetupContext()
}

/**
 * 注册组件销毁回调函数
 * @param fn 要注册的回调函数
 * @internal
 */
export function registryComponentDestroyCallback(fn: () => void) {
  const component = getSetupContext(false)
  if (component) {
    if (!component.unmountedCallbacks) {
      component.unmountedCallbacks = []
    }
    component.unmountedCallbacks.push(fn)
  }
}
