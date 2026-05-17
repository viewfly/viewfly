import type { Provider } from './di/_api'
import {
  createContext,
  jsx, Component, Portal, createRenderer2, Renderer
} from './base/_api'
import type { ElementNamespace, JSXNode, NativeNode, NativeRenderer } from './base/_api'
import { makeError } from './_utils/make-error'
import { Injector } from './di/_api'
import { flushReactiveEffectsSync } from './reactive/effect'
import { createSignal } from './reactive/signal'

const viewflyErrorFn = makeError('Viewfly')

/**
 * Viewfly 配置项
 */
export interface Config {
  /** 根节点 */
  root: JSXNode,
  /** 平台渲染器 */
  nativeRenderer: NativeRenderer
  /** 应用的上下文 */
  context?: Injector
  /** 是否自动更新视图 */
  autoUpdate?: boolean
  /** 根节点命名空间 */
  elementNamespace?: ElementNamespace
}

export interface Application<T extends NativeNode = NativeNode> {
  provide(providers: Provider | Provider[]): Application<T>

  mount(container: T): Application<T>

  use(module: Module | Module[]): Application<T>

  render(): Application<T>

  destroy(): void
}

export interface Module {
  setup?(app: Application): void

  onAfterStartup?(app: Application): void

  onDestroy?(): void
}

export function viewfly<T extends NativeNode>(config: Config): Application<T> {
  const {
    context,
    nativeRenderer,
    autoUpdate,
    root,
    elementNamespace
  } = Object.assign<Partial<Config>, Config>({ autoUpdate: true }, config)
  const modules: Module[] = []
  const destroyed = createSignal(false)
  const rootProviders: Provider[] = []

  let renderer: Renderer | null = null

  let isStarted = false
  let task: any = null

  function nextTick(callback: () => void) {
    if (task !== null) {
      return
    }
    task = Promise.resolve().then(() => {
      task = null
      callback()
    })
  }

  const app: Application<T> = {
    provide(providers: Provider | Provider[]) {
      providers = Array.isArray(providers) ? providers : [providers]
      rootProviders.push(...providers)
      return app
    },
    use(module: Module | Module[]) {
      if (Array.isArray(module)) {
        modules.push(...module)
      } else {
        modules.push(module)
      }
      return app
    },
    mount(container: T) {
      if (isStarted) {
        throw viewflyErrorFn('application has already started.')
      }
      for (const module of modules) {
        module.setup?.(app)
      }
      isStarted = true
      const rootComponent = new Component(null, () => {
        const rootContext = createContext(rootProviders, null, context)
        return () => {
          return jsx(Portal, {
            container,
            children: jsx(rootContext, {
              children: destroyed() ? null : root
            })
          })
        }
      }, {})

      rootComponent.markAsChanged = function (changedComponent?: Component) {
        this._changed = true
        if (changedComponent) {
          if (!this.changedSubComponents) {
            this.changedSubComponents = new Set<Component>()
          }
          this.changedSubComponents.add(changedComponent)
        }
        if (!autoUpdate) {
          return
        }
        nextTick(() => {
          renderer!.update()
        })
      }

      renderer = createRenderer2(rootComponent, nativeRenderer, elementNamespace)

      for (const module of modules) {
        module.onAfterStartup?.(app)
      }
      if (!autoUpdate) {
        return app
      }
      return app
    },
    render() {
      if (renderer) {
        flushReactiveEffectsSync()
        renderer.update()
        flushReactiveEffectsSync()
      }
      return app
    },
    destroy() {
      destroyed.set(true)
      if (!autoUpdate) {
        app.render()
      }
      for (const module of modules) {
        module.onDestroy?.()
      }
    }
  }

  return app
}
