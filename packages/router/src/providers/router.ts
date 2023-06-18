import { Navigator, QueryParams } from './navigator'
import { ComponentSetup } from '@viewfly/core'
import { Observable, Subject } from '@tanbo/stream'

export interface RouteConfig {
  name: string
  component: ComponentSetup | Promise<ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>

  afterEach?(): void
}

export class Router {
  onRefresh: Observable<void>

  get pathname() {
    if (this.parent) {
      return this.parent.afterPath.match(/[^\/?#]+/)?.[0] || ''
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

  constructor(private navigator: Navigator,
              public parent: Router | null,
              public afterPath: string) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  navigateTo(path: string, params?: QueryParams) {
    this.navigator.to(path, this, params)
    this.refresh(this.navigator.join(path, this, params))
  }

  refresh(afterPath: string) {
    this.afterPath = afterPath
    this.refreshEvent.next()
  }

  getSubviewAndAfterPath(routes: RouteConfig[]) {
    const subview = this.matchSubview(routes)
    if (subview) {
      if (subview.name === '') {
        return {
          afterPath: this.afterPath,
          subview
        }
      }
      if (subview.name === '*') {
        return {
          afterPath: '',
          subview
        }
      }
      return {
        afterPath: this.afterPath.substring(subview.name.length + 1),
        subview
      }
    }
    return null
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

  private matchSubview(config: RouteConfig[]) {
    let matchedConfig: RouteConfig | null = null
    let defaultConfig: RouteConfig | null = null
    let fallbackConfig: RouteConfig | null = null

    const afterPath = this.afterPath || ''
    let pathName = afterPath.match(/[^\/?#]+/)?.[0] || ''

    for (const item of config) {
      if (item.name === pathName) {
        matchedConfig = item
        break
      }
      if (item.name === '*') {
        if (!fallbackConfig) {
          fallbackConfig = item
        }
        continue
      }
      if (item.name === '') {
        if (!defaultConfig) {
          defaultConfig = item
        }
      }
    }
    return matchedConfig || defaultConfig || fallbackConfig
  }
}
