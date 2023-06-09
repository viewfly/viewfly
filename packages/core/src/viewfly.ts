import { Injector, NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'
import { microTask, Subscription } from '@tanbo/stream'

import { NativeNode, NativeRenderer, Renderer, RootComponentRef } from './foundation/_api'
import { JSXComponent, JSXElement, RootComponent } from './model/_api'
import { makeError } from './_utils/make-error'

const viewflyErrorFn = makeError('Viewfly')

export type RootNode = JSXElement | JSXComponent

/**
 * Viewfly 配置项
 */
export interface Config {
  /** Viewfly IoC 容器中提供者集合 */
  providers?: Provider[]
  /** 是否自动更新视图 */
  autoUpdate?: boolean
  /** 根节点 */
  root: RootNode,
  /** 根组件的上下文 */
  context?: Injector
}

/**
 * Viewfly 核心类，用于启动一个 Viewfly 应用
 */
export class Viewfly extends ReflectiveInjector {
  private destroyed = false
  private rootComponent: RootComponent
  private subscription = new Subscription()

  constructor(private config: Config) {
    super(new NullInjector(), [
      ...(config.providers || []),
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
      }
    ])
    this.rootComponent = this.createRootComponent(config.root)
  }

  /**
   * 启动 Viewfly
   * @param host 应用根节点
   */
  mount(host: NativeNode) {
    const rootComponentRef = this.get(RootComponentRef)
    rootComponentRef.host = host
    const renderer = this.get(Renderer)
    renderer.render()
    if (this.config.autoUpdate === false) {
      return
    }
    this.subscription.add(
      this.rootComponent.changeEmitter.pipe(
        microTask()
      ).subscribe(() => {
        renderer.refresh()
      })
    )
  }

  /**
   * 销毁 Viewfly 实例
   */
  destroy() {
    const renderer = this.get(Renderer)
    this.destroyed = true
    this.rootComponent.markAsDirtied()
    this.subscription.unsubscribe()
    renderer.refresh()
  }

  private createRootComponent(rootNode: RootNode) {
    return new RootComponent(() => {
      return () => {
        return this.destroyed ? null : rootNode
      }
    }, this.config.context)
  }
}
