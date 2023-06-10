import { NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'
import { microTask, Subscription } from '@tanbo/stream'

import { NativeNode, NativeRenderer, Renderer, RootComponentRef } from './foundation/_api'
import { ComponentFactory, JSXElement, JSXFragment, RootComponent } from './model/_api'
import { makeError } from './_utils/make-error'

const viewflyErrorFn = makeError('Viewfly')

export type RootNode = JSXElement | JSXFragment | ComponentFactory

/**
 * Viewfly 配置项
 */
export interface Config {
  /** 应用根节点 */
  host: NativeNode
  /** Viewfly IoC 容器中提供者集合 */
  providers?: Provider[]
  /** 是否自动更新视图 */
  autoUpdate?: boolean

  /** 根节点 */
  root: RootNode
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
            host: config.host,
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
   */
  start() {
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
    })
  }
}
