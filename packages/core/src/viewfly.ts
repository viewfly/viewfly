import { NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'

import { NativeNode, Renderer, RootComponentRef } from './foundation/_api'
import { RootComponent } from './model/root.component'
import { Component } from './model/component'
import { JSXElement, JSXFragment } from './model/jsx-element'

export interface Config {
  providers?: Provider[]
  host: NativeNode,

  root(): Component | JSXElement | JSXFragment
}

export class Viewfly extends ReflectiveInjector {
  constructor(config: Config) {
    super(new NullInjector(), [
      ...(config.providers || []),
      Renderer,
      {
        provide: RootComponentRef,
        useFactory: () => {
          return {
            host: config.host,
            component: this.createRootComponent(config.root)
          }
        }
      }
    ])
  }

  start() {
    const renderer = this.get(Renderer)
    renderer.render()
  }

  private createRootComponent(factory: () => Component | JSXElement | JSXFragment) {

    return new RootComponent(() => factory, null)
  }
}
