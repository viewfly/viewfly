import { Observable, Subject } from '@tanbo/stream'
import { makeError } from '@viewfly/core'

import { Navigator, QueryParams } from './navigator'
import { Route } from './routes'

const routerErrorFn = makeError('Router')

/** 与 matchRoute 的 pathname 参数同粒度比较（去掉首尾 `/`） */
function normalizeRoutePathSegment(path: string): string {
  return path.replace(/^\/+|\/+$/g, '') || ''
}

export class Router {
  onRefresh: Observable<void>

  /** 当前重定向链上已解析过的 path 段（规范化后）；非重定向成功匹配后清空 */
  private redirectTrail: Set<string> | null = null

  private static readonly maxRedirectHops = 32

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

  replaceTo(path: string, params?: QueryParams, fragment?: string | null) {
    this.navigator.replace(path, this, params, fragment || void 0)
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

  private clearRedirectTrail() {
    this.redirectTrail = null
  }

  private beginRedirectResolution(pathname: string) {
    const key = normalizeRoutePathSegment(pathname)
    if (this.redirectTrail === null) {
      this.redirectTrail = new Set()
    }
    if (this.redirectTrail.size >= Router.maxRedirectHops) {
      const chain = [...this.redirectTrail].join(' -> ')
      this.clearRedirectTrail()
      throw routerErrorFn(
        `Redirect chain exceeded ${Router.maxRedirectHops} hops (last segment: '${pathname}', chain: ${chain})`
      )
    }
    this.redirectTrail.add(key)
  }

  private assertRedirectTarget(pathname: string, target: string) {
    const cur = normalizeRoutePathSegment(pathname)
    const next = normalizeRoutePathSegment(target)
    if (next === cur) {
      this.clearRedirectTrail()
      throw routerErrorFn(`Self-redirect at '${pathname}' (redirect target equals current path)`)
    }
    if (this.redirectTrail!.has(next)) {
      const chain = `${[...this.redirectTrail!].join(' -> ')} -> ${next}`
      this.clearRedirectTrail()
      throw routerErrorFn(`Redirect cycle detected (chain: ${chain})`)
    }
  }

  private matchRoute(routes: Route[], pathname: string) {
    this.beginRedirectResolution(pathname)

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
      this.clearRedirectTrail()
      return route
    }
    if (typeof route.redirectTo === 'function') {
      const p = route.redirectTo(pathname)
      if (typeof p === 'string') {
        this.assertRedirectTarget(pathname, p)
        this.navigateTo(p)
      } else if (typeof p === 'object') {
        this.assertRedirectTarget(pathname, p.pathname)
        this.navigateTo(p.pathname, p.queryParams, p.fragment)
      } else {
        this.clearRedirectTrail()
        throw routerErrorFn(`Router redirect to '${pathname}' not supported`)
      }
      return null
    }
    if (typeof route.redirectTo === 'string') {
      this.assertRedirectTarget(pathname, route.redirectTo)
      this.navigateTo(route.redirectTo)
      return null
    }
    this.clearRedirectTrail()
    return route
  }
}
