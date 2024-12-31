import { Key, Props } from './jsx-element'
import { makeError } from '../_utils/make-error'
import { getObjectChanges } from './_utils'
import { NativeNode } from './injection-tokens'
import { JSX } from './types'
import { LifeCycleCallback, onMounted } from './lifecycle'
import { DynamicRef } from './ref'
import { Dep, popDepContext, pushDepContext } from '../reactive/dep'
import { internalWrite, readonlyProxyHandler } from '../reactive/reactive'

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

export interface ComponentSetup<P = any> {
  (props: P): (() => JSXNode) | ComponentInstance<P>
}

function toRefs(ref: any): DynamicRef<any>[] {
  return (Array.isArray(ref) ? ref : [ref]).filter(i => {
    return i instanceof DynamicRef
  })
}

function createReadonlyProxy<T extends object>(value: T): T {
  return new Proxy(value, readonlyProxyHandler) as T
}

/**
 * Viewfly 组件管理类，用于管理组件的生命周期，上下文等
 */
export class Component {
  instance!: ComponentInstance<Props>

  changedSubComponents = new Set<Component>()

  get dirty() {
    return this._dirty
  }

  get changed() {
    return this._changed
  }

  unmountedCallbacks?: LifeCycleCallback[] | null
  mountCallbacks?: LifeCycleCallback[] | null
  updatedCallbacks?: LifeCycleCallback[] | null
  private updatedDestroyCallbacks?: Array<() => void> | null

  protected _dirty = true
  protected _changed = true

  private isFirstRendering = true

  private refs: DynamicRef<any>[] | null = null
  private listener = new Dep(() => {
    this.markAsDirtied()
  })

  props: Record<string, any>
  private rawProps: Record<string, any>

  constructor(public readonly parentComponent: Component | null,
              public readonly type: ComponentSetup,
              props: Record<string, any>,
              public readonly key?: Key) {
    this.rawProps = props
    this.props = createReadonlyProxy({ ...props })
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
    componentSetupStack.push(this)
    const render = this.type(this.props)
    const isRenderFn = typeof render === 'function'
    this.instance = isRenderFn ? { $render: render } : render
    const refs = toRefs((this.props as Record<string, any>).ref)
    if (refs.length) {
      this.refs = refs
      onMounted(() => {
        const refs = this.refs!
        const length = refs.length
        for (let i = 0; i < length; i++) {
          const ref = refs[i]
          ref.bind(this.instance)
        }
        return () => {
          const refs = this.refs!
          const length = refs.length
          for (let i = 0; i < length; i++) {
            const ref = refs[i]
            ref.unBind(this.instance)
          }
        }
      })
    }
    componentSetupStack.pop()

    pushDepContext(this.listener)
    const template = this.instance.$render()

    popDepContext()
    update(template, this.instance.$portalHost)
    this.rendered()
  }

  update(newProps: Record<string, any>,
         updateChildren: (jsxNode: JSXNode) => void,
         reuseChildren: (skipSubComponentDiff: boolean) => void) {
    const oldProps = this.rawProps
    this.rawProps = newProps
    if (newProps !== oldProps) {
      const {
        add,
        remove,
        replace
      } = getObjectChanges(newProps, oldProps)
      if (add.length || remove.length || replace.length) {
        if (typeof this.instance.$useMemo === 'function') {
          if (this.instance.$useMemo(newProps, oldProps)) {
            reuseChildren(true)
            this.rendered()
            return
          }
        }
        add.forEach(([key, value]) => {
          internalWrite(() => {
            this.props[key] = value
          })
        })
        remove.forEach(([key]) => {
          internalWrite(() => {
            Reflect.deleteProperty(this.props, key)
          })
        })
        replace.forEach(([key, value]) => {
          internalWrite(() => {
            this.props[key] = value
          })
        })
      } else if (!this.dirty) {
        reuseChildren(false)
        this.rendered()
        return
      }

      const newRefs = toRefs(newProps.ref)

      if (this.refs) {
        const len = this.refs.length
        for (let i = 0; i < len; i++) {
          const oldRef = this.refs[i]
          if (!newRefs.includes(oldRef)) {
            oldRef.unBind(this.instance)
          }
        }
      }
      const len = newRefs.length
      for (let i = 0; i < len; i++) {
        const newRef = newRefs[i]
        newRef.bind(this.instance)
      }
      if (len) {
        this.refs = newRefs
      }
    }

    this.listener.destroy()
    pushDepContext(this.listener)
    const template = this.instance.$render()
    popDepContext()
    updateChildren(template)

    this.rendered()
  }

  destroy() {
    this.listener.destroy()
    this.updatedDestroyCallbacks?.forEach(fn => {
      fn()
    })
    this.unmountedCallbacks?.forEach(fn => {
      fn()
    })
    if (this.parentComponent instanceof Component) {
      this.parentComponent.changedSubComponents.delete(this)
    }
    (this as unknown as {parentComponent: any}).parentComponent =
        this.updatedDestroyCallbacks =
          this.mountCallbacks =
            this.updatedCallbacks =
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
 */
export function getCurrentInstance(): Component {
  return getSetupContext()
}
