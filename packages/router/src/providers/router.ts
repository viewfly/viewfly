import { Observable, Subject } from '@tanbo/stream'
import { makeError } from '@viewfly/core'

import { Navigator, QueryParams } from './navigator'
import { Route } from './routes'

const routerErrorFn = makeError('Router')

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
    public parent: Router | null
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

  resolve(routes: Route[]) {
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

  private matchRoute(routes: Route[], pathname: string) {
    let matchedRoute: Route | null = null
    let defaultRoute: Route | null = null
    let fallbackRoute: Route | null = null
    for (const item of routes) {
      if (item.path === pathname) {
        matchedRoute = item
        break

      } else if (item.path === '*') {
        if (!fallbackRoute) {
          fallbackRoute = item
        }

      } else if (item.path === '') {
        if (!defaultRoute) {
          defaultRoute = item
        }
      }
    }

    const route = matchedRoute || defaultRoute || fallbackRoute
    if (!route) {
      return route
    }
    if (typeof route.redirectTo === 'function') {
      const p = route.redirectTo(pathname)
      if (typeof p === 'string') {
        this.navigateTo(p)
      } else if (typeof p === 'object') {
        this.navigateTo(p.pathname, p.queryParams, p.fragment)
      } else {
        throw routerErrorFn(`Router redirect to '${pathname}' not supported`)
      }
      return null
    }
    if (typeof route.redirectTo === 'string') {
      this.navigateTo(route.redirectTo)
      return null
    }
    return route
  }
}
