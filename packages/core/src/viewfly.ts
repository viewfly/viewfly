import type { Provider } from './di/_api'
import {
  JSXInternal,
  NativeNode,
  NativeRenderer,
  createRenderer,
  provide,
  RootComponent
} from './foundation/_api'
import { makeError } from './_utils/make-error'
import { Injector } from './di/_api'

const viewflyErrorFn = makeError('Viewfly')

declare const process: any
export const VERSION: string = process.env.version

/**
 * Viewfly 配置项
 */
export interface Config {
  /** 根节点 */
  root: JSXInternal.JSXNode,
  /** 平台渲染器 */
  nativeRenderer: NativeRenderer
  /** 应用的上下文 */
  context?: Injector
  /** 是否自动更新视图 */
  autoUpdate?: boolean
}

export interface Application<T extends NativeNode = NativeNode> {
  provide(providers: Provider | Provider[]): Application<T>

  mount(host: T, autoUpdate?: boolean): Application<T>

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
  const appProviders: Provider[] = []
  const modules: Module[] = []
  let destroyed = false

  const rootComponent = new RootComponent(context || null, () => {
    provide(appProviders)
    return () => {
      return destroyed ? null : root
    }
  })
  const render = createRenderer(rootComponent, nativeRenderer, VERSION)

  let isStarted = false
  let task: any = null

  function nextTick(callback: () => void) {
    if (task !== null) {
      return
    }
    task = setTimeout(() => {
      task = null
      callback()
    })
  }

  let appHost: T | null = null

  const app: Application<T> = {
    provide(providers: Provider | Provider[]) {
      if (Array.isArray(providers)) {
        appProviders.unshift(...providers)
      } else {
        appProviders.unshift(providers)
      }
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

      const refresh = () => {
        if (destroyed) {
          return
        }
        render(host)
      }

      rootComponent.onChange = function () {
        nextTick(refresh)
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
