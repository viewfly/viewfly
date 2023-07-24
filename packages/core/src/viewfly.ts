import { Injector, normalizeProvider, NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'
import { microTask, Subscription } from '@tanbo/stream'

import { HostRef, NativeNode, NativeRenderer, Renderer, RootComponentRef } from './foundation/_api'
import { JSXInternal, RootComponent } from './model/_api'
import { makeError } from './_utils/make-error'

const viewflyErrorFn = makeError('Viewfly')

/**
 * Viewfly 配置项
 */
export interface Config {
  /** 是否自动更新视图 */
  autoUpdate?: boolean
  /** 根节点 */
  root: JSXInternal.JSXNode,
  /** 应用的上下文 */
  context?: Injector
}

/**
 * Viewfly 核心类，用于启动一个 Viewfly 应用
 */
export class Viewfly<T extends NativeNode = NativeNode> extends ReflectiveInjector {
  private destroyed = false
  private rootComponent: RootComponent
  private subscription = new Subscription()

  constructor(private config: Config) {
    super(config.context || new NullInjector(), [
      Renderer,
      {
        provide: RootComponentRef,
        useFactory: () => {
          return {
            component: this.rootComponent
          }
        }
      },
      {
        provide: NativeRenderer,
        useFactory() {
          throw viewflyErrorFn('You must implement the `NativeRenderer` interface to start Viewfly!')
        }
      },
      {
        provide: HostRef,
        useFactory() {
          throw viewflyErrorFn('Viewfly has not mounted!')
        }
      }
    ])
    this.rootComponent = this.createRootComponent(config.root)
  }

  provide(providers: Provider | Provider[]) {
    providers = Array.isArray(providers) ? providers : [providers]
    this.normalizedProviders.unshift(...providers.map(i => normalizeProvider(i)))
    return this
  }

  /**
   * 启动 Viewfly
   * @param host 应用根节点
   */
  mount(host: T) {
    this.provide({
      provide: HostRef,
      useValue: {
        host
      }
    })
    const renderer = this.get(Renderer)
    renderer.render()
    if (this.config.autoUpdate === false) {
      return this
    }
    this.subscription.add(
      this.rootComponent.changeEmitter.pipe(
        microTask()
      ).subscribe(() => {
        renderer.render()
      })
    )
    return this
  }

  render() {
    const renderer = this.get(Renderer)
    renderer.render()
  }

  /**
   * 销毁 Viewfly 实例
   */
  destroy() {
    this.destroyed = true
    this.rootComponent.markAsDirtied()
    this.subscription.unsubscribe()
    this.render()
  }

  private createRootComponent(rootNode: JSXInternal.JSXNode) {
    return new RootComponent(() => {
      return () => {
        return this.destroyed ? null : rootNode
      }
    }, this)
  }
}
