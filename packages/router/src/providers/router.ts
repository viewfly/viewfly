import { JSXInternal } from '@viewfly/core'
import { Observable, Subject } from '@tanbo/stream'

import { Navigator, QueryParams } from './navigator'

export interface RouteConfig {
  name: string
  component: JSXInternal.ElementClass | Promise<JSXInternal.ElementClass>

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

  private path = ''
  private refreshEvent = new Subject<void>()

  constructor(
    private navigator: Navigator,
    public parent: Router | null
  ) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  navigateTo(path: string, params?: QueryParams) {
    this.navigator.to(path, this, params)
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

    if (routeConfig.name === '') {
      remainingPath = this.path
    } else if (routeConfig.name === '*') {
      remainingPath = ''
    } else {
      remainingPath = this.path.substring(routeConfig.name.length + 1)
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
      if (item.name === pathname) {
        matchedConfig = item
        break

      } else if (item.name === '*') {
        if (!fallbackConfig) {
          fallbackConfig = item
        }

      } else if (item.name === '') {
        if (!defaultConfig) {
          defaultConfig = item
        }
      }
    }

    return matchedConfig || defaultConfig || fallbackConfig
  }
}
