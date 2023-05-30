import { Component, JSXElement, JSXText } from '@viewfly/core'

type ViewflyNode = JSXElement | JSXText | Component

export interface RouterConfig {
  routers: {
    [key: string]: Component
  }

  children?: ViewflyNode
}

export function RouterOutlet(config: RouterConfig){
  return () => {
    return config.children
  }
}