import { Observable, Subject } from '@tanbo/stream'
import { ComponentSetup } from '@viewfly/core'

import { Navigator, QueryParams } from './navigator'

export interface RouteConfig {
  path: string
  component?: ComponentSetup
  asyncComponent?: () => Promise<ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>
}

export class Router {
  onRefresh: Observable<void>

  get deep(): number {
    return this.parent ? this.parent.deep + 1 : 0
  }

  get path() {
    return this.navigator.urlTree.paths.at(this.deep) || ''
  }

  private refreshEvent = new Subject<void>()

  constructor(
    private navigator: Navigator,
    public parent: Router | null,
  ) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  navigateTo(path: string, params?: QueryParams, fragment?: string) {
    this.navigator.to(path, this, params, fragment)
  }

  replaceTo(path: string, params?: QueryParams) {
    this.navigator.replace(path, this, params)
  }

  refresh() {
    this.refreshEvent.next()
  }

  consumeConfig(routes: RouteConfig[]) {
    return this.matchRoute(routes)
  }

  back() {
    this.navigator.back()
  }

  forward() {
    this.navigator.forward()
  }

  go(offset: number) {
    this.navigator.go(offset)
  }

  private matchRoute(configs: RouteConfig[]) {
    let matchedConfig: RouteConfig | null = null
    let defaultConfig: RouteConfig | null = null
    let fallbackConfig: RouteConfig | null = null

    const pathname = (this.path || '').match(/[^\/?#]+/)?.[0] || ''

    for (const item of configs) {
      if (item.path === pathname) {
        matchedConfig = item
        break

      } else if (item.path === '*') {
        if (!fallbackConfig) {
          fallbackConfig = item
        }

      } else if (item.path === '') {
        if (!defaultConfig) {
          defaultConfig = item
        }
      }
    }

    return matchedConfig || defaultConfig || fallbackConfig
  }
}
