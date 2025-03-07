import { Observable, Subject } from '@tanbo/stream'
import { ComponentSetup, makeError } from '@viewfly/core'

import { Navigator, NavigatorParams, QueryParams } from './navigator'

const routerErrorFn = makeError('Router')

export interface RouteConfig {
  path: string
  component?: ComponentSetup
  asyncComponent?: () => Promise<ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>

  afterEach?(): void

  redirectTo?: string | ((path: string) => string | NavigatorParams)
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

  navigateTo(path: string, params?: QueryParams, fragment?: string | null) {
    this.navigator.to(path, this, params, fragment || void 0)
  }

  replaceTo(path: string, params?: QueryParams) {
    this.navigator.replace(path, this, params)
  }

  refresh() {
    this.refreshEvent.next()
  }

  consumeConfig(routes: RouteConfig[]) {
    return this.matchRoute(routes, this.path)
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

  private matchRoute(configs: RouteConfig[], pathname: string) {
    let matchedConfig: RouteConfig | null = null
    let defaultConfig: RouteConfig | null = null
    let fallbackConfig: RouteConfig | null = null
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

    const config = matchedConfig || defaultConfig || fallbackConfig
    if (!config) {
      return config
    }
    if (typeof config.redirectTo === 'function') {
      const p = config.redirectTo(pathname)
      if (typeof p === 'string') {
        this.navigateTo(p)
      } else if (typeof p === 'object') {
        this.navigateTo(p.pathname, p.queryParams, p.fragment)
      } else {
        throw routerErrorFn(`Router redirect to '${pathname}' not supported`)
      }
      return null
    }
    if (typeof config.redirectTo === 'string') {
      this.navigateTo(config.redirectTo)
      return null
    }
    return config
  }
}
