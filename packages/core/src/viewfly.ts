import { NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'
import { microTask, Subscription } from '@tanbo/stream'

import { NativeNode, Renderer, RootComponentRef } from './foundation/_api'
import { RootComponent } from './model/root.component'
import { JSXTemplate } from './model/component'

export interface Config {
  host: NativeNode
  providers?: Provider[]
  autoUpdate?: boolean

  root(): JSXTemplate
}

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
      }
    ])
    this.rootComponent = this.createRootComponent(config.root)
  }

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

  destroy() {
    const renderer = this.get(Renderer)
    this.destroyed = true
    this.rootComponent.markAsDirtied()
    this.subscription.unsubscribe()
    renderer.render()
  }

  private createRootComponent(factory: () => JSXTemplate) {
    return new RootComponent(() => {
      return () => {
        return this.destroyed ? null : factory()
      }
    })
  }
}
