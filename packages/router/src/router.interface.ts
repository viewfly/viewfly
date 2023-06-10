import { JSXChildNode } from '@viewfly/core'

export interface RouteChangeEvent {
  pathname: string
}

export interface RouteConfig {
  path: string
  component: JSXChildNode
}

export interface RouteOutletConfig {
  config: RouteConfig[]
}