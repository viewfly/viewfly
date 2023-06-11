import { JSXChildNode } from '@viewfly/core'

export interface RouterChangeEvent {
  path: string
  state: any
}

export interface RouteConfig {
  path: string
  component: JSXChildNode
}

export interface RouteOutletConfig {
  config: RouteConfig[]
}

export interface RouterConfig {
  history: History
  location: Location
}