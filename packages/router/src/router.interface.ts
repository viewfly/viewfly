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

export abstract class History {
  abstract get length(): number
  abstract get scrollRestoration(): ScrollRestoration
  abstract get state(): any

  abstract back(): void
  abstract forward(): void
  abstract go(delta?: number): void
  abstract pushState(data: any, unused: string, url?: string | URL | null): void
  abstract replaceState(data: any, unused: string, url?: string | URL | null): void
}

export abstract class Location {
  hash = ''
  pathname = ''
  search = ''

  abstract assign(url: string | URL): void
  abstract reload(): void
  abstract replace(url: string | URL): void
}