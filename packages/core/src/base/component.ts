import { Key, Props } from './jsx-element'
import { makeError } from '../_utils/make-error'
import { NativeNode } from './injection-tokens'
import { JSX } from './types'
import { LifeCycleCallback, onMounted } from './lifecycle'
import { DynamicRef } from './ref'
import { Dep, popDepContext, pushDepContext } from '../reactive/dep'
import { internalWrite, readonlyProxyHandler } from '../reactive/reactive'
import { comparePropsWithCallbacks, ComponentAtom } from './_utils'

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

export interface ComponentViewMetadata {
  atom: ComponentAtom
  host: NativeNode,
  isParent: boolean,
  rootHost: NativeNode
}

function createReadonlyProxy<T extends object>(value: T): T {
  return new Proxy(value, readonlyProxyHandler) as T
}

/**
 * Viewfly 组件管理类，用于管理组件的生命周期，上下文等
 */
export class Component {
  declare readonly parentComponent: Component | null
  declare readonly type: ComponentSetup
  declare props: Record<string, any>
  declare readonly key?: Key
  declare instance: ComponentInstance<Props>

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

  declare private refs: DynamicRef<any>[] | null
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
    this.refs = null
    this.rawProps = props
    this.props = createReadonlyProxy({ ...props })
    this.listener = new Dep(() => {
      this.markAsDirtied()
    })
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

  render(update: (template: JSXNode, portalHost?: NativeNode) => void) {
    componentSetupStack.push(this)
    const render = this.type(this.props)
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
    componentSetupStack.pop()

    pushDepContext(this.listener)
    const template = this.instance.$render()

    popDepContext()
    update(template, this.instance.$portalHost)
    this.rendered()
  }

  updateProps(newProps: Record<string, any>) {
    const oldProps = this.rawProps
    this.rawProps = newProps
    const newRefs = toRefs(newProps.ref)
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

  canUpdate(oldProps: Record<string, any>, newProps: Record<string, any>): boolean {
    if (typeof this.instance.$useMemo === 'function') {
      if (this.instance.$useMemo(newProps, oldProps)) {
        return false
      }
    }
    return true
  }

  rerender() {
    this.listener.destroy()
    pushDepContext(this.listener)
    const template = this.instance.$render()
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
 * 获取当前组件实例
 */
export function getCurrentInstance(): Component {
  return getSetupContext()
}
