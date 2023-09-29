import { JSXInternal } from '@viewfly/core'
import { Observable, Subject } from '@tanbo/stream'

import { Navigator, QueryParams } from './navigator'

export interface RouteConfig {
  path: string
  component?: JSXInternal.ComponentSetup
  asyncComponent?: () => Promise<JSXInternal.ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>
}

export class Router {
  onRefresh: Observable<void>

  get pathname() {
    if (this.parent) {
      const name = this.parent.path.match(/[^\/?#]+/)
      if (name) {
        return name[0]
      }
    }

    return ''
  }

  get beforePath() {
    if (this.parent) {
      return this.parent.beforePath + '/' + this.pathname
    }

    return ''
  }

  private refreshEvent = new Subject<void>()

  constructor(
    private navigator: Navigator,
    public parent: Router | null,
    public path: string
  ) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  navigateTo(path: string, params?: QueryParams, fragment?: string) {
    this.navigator.to(path, this, params, fragment)
  }

  replaceTo(path: string, params?: QueryParams) {
    this.navigator.replace(path, this, params)
  }

  refresh(path: string) {
    this.path = path
    this.refreshEvent.next()
  }

  consumeConfig(routes: RouteConfig[]) {
    const routeConfig = this.matchRoute(routes)
    if (!routeConfig) {
      return null
    }

    let remainingPath = ''

    if (routeConfig.path === '') {
      remainingPath = this.path
    } else if (routeConfig.path === '*') {
      remainingPath = ''
    } else {
      remainingPath = this.path.substring(routeConfig.path.length + 1)
    }

    return {
      remainingPath,
      routeConfig
    }
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
