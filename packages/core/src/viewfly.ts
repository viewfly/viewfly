import type { Provider } from './di/_api'
import {
  NativeNode,
  NativeRenderer,
  createRenderer,
  RootComponent,
  JSXNode,
  ElementNamespace, createContext, jsx
} from './base/_api'
import { makeError } from './_utils/make-error'
import { Injector } from './di/_api'

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

  mount(host: T): Application<T>

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
    root
  } = Object.assign<Partial<Config>, Config>({ autoUpdate: true }, config)
  const modules: Module[] = []
  let destroyed = false
  let appHost: T | null = null

  const rootProviders: Provider[] = []
  const rootComponent = new RootComponent(() => {
    const rootContext = createContext(rootProviders, void 0, context)
    return () => {
      return jsx(rootContext, {
        children: destroyed ? null : root
      })
    }
  }, function () {
    if (destroyed || !autoUpdate) {
      return
    }
    nextTick(() => {
      render(appHost!)
    })
  })
  const render = createRenderer(rootComponent, nativeRenderer, config.elementNamespace)

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
    mount(host: T) {
      if (isStarted) {
        throw viewflyErrorFn('application has already started.')
      }
      for (const module of modules) {
        module.setup?.(app)
      }
      isStarted = true
      appHost = host
      render(host)
      for (const module of modules) {
        module.onAfterStartup?.(app)
      }
      if (!autoUpdate) {
        return app
      }
      return app
    },
    render() {
      if (appHost) {
        render(appHost)
      }
      return app
    },
    destroy() {
      destroyed = true
      rootComponent.markAsDirtied()
      app.render()
      for (const module of modules) {
        module.onDestroy?.()
      }
    }
  }

  return app
}
