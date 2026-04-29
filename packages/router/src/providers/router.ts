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

  /** 当前层最近一次匹配所消费的 URL 段数（默认 1，保持历史行为） */
  private consumedSegments = 1

  get deep(): number {
    return this.parent ? this.parent.deep + this.parent.consumedSegments : 0
  }

  private get remainingPaths(): string[] {
    return this.navigator.urlTree.paths.slice(this.deep)
  }

  get path() {
    return this.remainingPaths[0] || ''
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
    return this.matchRoute(routes, this.remainingPaths)
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

  private matchRoute(routes: Route[], remainingPaths: string[]) {
    const pathname = remainingPaths[0] || ''
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
      this.consumedSegments = 0
      this.clearRedirectTrail()
      return route
    }
    this.consumedSegments = route === defaultRoute
      ? 0
      : (remainingPaths.length > 0 ? 1 : 0)
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
