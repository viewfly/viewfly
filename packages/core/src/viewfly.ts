import { NullInjector, Provider, ReflectiveInjector } from '@tanbo/di'

import { NativeNode, Renderer, RootComponentRef } from './foundation/_api'
import { ChangeEmitter } from './model/change-emitter'
import { Component } from './model/component'
import { jsx, JSXElement } from './model/jsx-element'


export interface Config {
  providers?: Provider[]
  host: NativeNode,
  root: Component | JSXElement
}

export class Viewfly extends ReflectiveInjector {
  constructor(config: Config) {
    super(new NullInjector(), [
      ...(config.providers || []),
      Renderer,
      ChangeEmitter,
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

  private createRootComponent(child: Component | JSXElement) {

    function rootComponent() {
      return () => child
    }

    return child instanceof Component ? child : jsx(rootComponent, null)
  }
}
