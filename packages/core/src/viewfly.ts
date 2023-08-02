import type { Injector, Provider } from './di/_api'
import {
  JSXInternal,
  NativeNode,
  NativeRenderer,
  createRenderer,
  RootComponent,
  provide
} from './foundation/_api'
import { makeError } from './_utils/make-error'

const viewflyErrorFn = makeError('Viewfly')

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

  render(): Application<T>

  destroy(): void
}


export function viewfly<T extends NativeNode>({ context, nativeRenderer, autoUpdate, root }: Config): Application<T> {
  const appProviders: Provider[] = []
  let destroyed = false

  const rootComponent = new RootComponent(context || null as any, () => {
    provide(appProviders)
    return () => {
      return destroyed ? null : root
    }
  })
  const render = createRenderer(rootComponent, nativeRenderer)

  let isStarted = false
  let task: Promise<any> | null = null

  function microTask(callback: () => void) {
    if (!task) {
      task = Promise.resolve().then(() => {
        task = null
        callback()
      })
    }
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
    mount(host: T) {
      if (isStarted) {
        throw viewflyErrorFn('application has already started.')
      }
      isStarted = true
      appHost = host
      render(host)
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
        microTask(refresh)
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
    }
  }

  return app
}
