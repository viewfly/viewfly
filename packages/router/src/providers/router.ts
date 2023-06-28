import { Navigator, QueryParams } from './navigator'
import { ComponentSetup } from '@viewfly/core'
import { Observable, Subject } from '@tanbo/stream'

export interface RouteConfig {
  name: string
  component: ComponentSetup | Promise<ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>
}

export class Router {
  onRefresh: Observable<void>

  get pathname() {
    if (this.parent) {
      return this.parent.path.match(/[^\/?#]+/)?.[0] || ''
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

  navigateTo(path: string, params?: QueryParams) {
    this.navigator.to(path, this, params)
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

    // 匹配所有以 '/'、'?'、'#' 开头的字符串
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
