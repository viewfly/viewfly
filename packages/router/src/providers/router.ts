import { Observable, Subject } from '@tanbo/stream'
import { makeError } from '@viewfly/core'

import { Navigator, NavigatorParams, QueryParams } from './navigator'
import { Params, Route } from './routes'

const routerErrorFn = makeError('Router')

type ParsedRouteSegment =
  | { kind: 'static', value: string }
  | { kind: 'param', name: string, optional: boolean }

/** 与 matchRoute 的 pathname 参数同粒度比较（去掉首尾 `/`） */
function normalizeRoutePathSegment(path: string): string {
  return path.replace(/^\/+|\/+$/g, '') || ''
}

export class Router {
  onRefresh: Observable<void>
  private lastResolvedParams: NavigatorParams | null = null

  /** 当前重定向链上已解析过的 path 段（规范化后）；非重定向成功匹配后清空 */
  private redirectTrail: Set<string> | null = null

  private static readonly maxRedirectHops = 32

  /** 当前层最近一次匹配所消费的 URL 段数（默认 1，保持历史行为） */
  private consumedSegments = 1
  private routeParams: Params = {}

  /**
   * 本次 `resolve` 命中的 `route.path` 上的动态段（供子 Router、`canActivate`、`redirectTo`）。
   * 与 `params` 按层隔离（对齐 Angular）：有 `parent` 时 `params` 只表示本层注入域，不由子级匹配覆盖。
   */
  lastResolvePathParams: Params = {}

  get deep(): number {
    return this.parent ? this.parent.deep + this.parent.consumedSegments : 0
  }

  private get remainingPaths(): string[] {
    return this.navigator.urlTree.paths.slice(this.deep)
  }

  get path() {
    return this.remainingPaths[0] || ''
  }

  get params(): Params {
    return this.routeParams
  }

  setParams(params: Params) {
    this.routeParams = { ...params }
  }

  private refreshEvent = new Subject<void>()

  constructor(
    private navigator: Navigator,
    public parent: Router | null
  ) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  navigateTo(path: string, queryParams?: QueryParams, hash?: string | null) {
    this.navigator.to(path, this, queryParams, hash)
  }

  replaceTo(path: string, queryParams?: QueryParams, hash?: string | null) {
    this.navigator.replace(path, this, queryParams, hash)
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

  private getNavigatorParams(): NavigatorParams {
    const pathname = '/' + this.navigator.urlTree.paths.join('/')
    return {
      pathname: pathname === '/' ? pathname : pathname.replace(/\/+/g, '/'),
      queryParams: this.navigator.urlTree.queryParams,
      hash: this.navigator.urlTree.hash
    }
  }

  private cloneNavigatorParams(params: NavigatorParams): NavigatorParams {
    return {
      pathname: params.pathname,
      queryParams: { ...params.queryParams },
      hash: params.hash
    }
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

  private splitRoutePath(path: string): string[] {
    const normalized = normalizeRoutePathSegment(path)
    return normalized ? normalized.split('/') : []
  }

  /** 单段路由：`user` | `:id` | `:id?`（`?` 仅表示可选；整条 path 里 `:…?` 只允许出现在最后一段，由 matchRoutePath 校验） */
  private parseRouteSegment(segment: string): ParsedRouteSegment | null {
    if (!segment) {
      return null
    }
    if (segment.startsWith(':')) {
      const optionalMatch = /^:([^:?]+)\?$/.exec(segment)
      if (optionalMatch) {
        const name = optionalMatch[1]
        return name ? { kind: 'param', name, optional: true } : null
      }
      const name = segment.slice(1)
      if (!name || name.includes('?')) {
        return null
      }
      return { kind: 'param', name, optional: false }
    }
    return { kind: 'static', value: segment }
  }

  private matchRoutePath(routePath: string, remainingPaths: string[]) {
    if (!routePath || routePath === '*') {
      return null
    }
    const rawSegments = this.splitRoutePath(routePath)
    const segments: ParsedRouteSegment[] = []
    for (const s of rawSegments) {
      const parsed = this.parseRouteSegment(s)
      if (!parsed) {
        if (s.startsWith(':')) {
          throw routerErrorFn(
            `Empty or invalid path parameter segment '${s}' in '${routePath}' (use ':name' with a non-empty name).`
          )
        }
        return null
      }
      segments.push(parsed)
    }

    for (let i = 0; i < segments.length; i++) {
      const s = segments[i]
      if (s.kind === 'param' && s.optional && i !== segments.length - 1) {
        throw routerErrorFn(
          // eslint-disable-next-line max-len -- 完整错误信息便于排查非法路由配置
          `Optional path parameter ':${s.name}?' must be the last segment of '${routePath}' (optional params are only allowed at the end of the path).`
        )
      }
    }

    const seenParamNames = new Set<string>()
    for (const s of segments) {
      if (s.kind === 'param') {
        if (seenParamNames.has(s.name)) {
          throw routerErrorFn(
            `Duplicate path parameter ':${s.name}' in '${routePath}' (each name must appear at most once).`
          )
        }
        seenParamNames.add(s.name)
      }
    }

    const urlLen = remainingPaths.length
    let ui = 0
    const pathParams: Params = {}

    for (let ri = 0; ri < segments.length; ri++) {
      const seg = segments[ri]
      if (seg.kind === 'static') {
        if (ui >= urlLen || remainingPaths[ui] !== seg.value) {
          return null
        }
        ui++
        continue
      }
      if (!seg.optional) {
        if (ui >= urlLen) {
          return null
        }
        pathParams[seg.name] = remainingPaths[ui]
        ui++
        continue
      }
      if (ui >= urlLen) {
        pathParams[seg.name] = ''
        continue
      }
      pathParams[seg.name] = remainingPaths[ui]
      ui++
    }

    // 前缀匹配：允许 URL 还有后续段（交给子 RouterOutlet），与历史行为一致
    return {
      consumedSegments: ui,
      params: pathParams
    }
  }

  private matchRoute(routes: Route[], remainingPaths: string[]) {
    this.lastResolvePathParams = {}
    const pathname = remainingPaths[0] || ''
    this.beginRedirectResolution(pathname)

    let matchedRoute: Route | null = null
    let matchedRouteResult: { consumedSegments: number, params: Params } | null = null
    let defaultRoute: Route | null = null
    let fallbackRoute: Route | null = null
    for (const item of routes) {
      const matchResult = this.matchRoutePath(item.path, remainingPaths)
      if (matchResult) {
        matchedRoute = item
        matchedRouteResult = matchResult
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
      this.routeParams = {}
      this.lastResolvePathParams = {}
      this.clearRedirectTrail()
      this.lastResolvedParams = this.cloneNavigatorParams(this.getNavigatorParams())
      return route
    }
    if (route === defaultRoute) {
      this.consumedSegments = 0
      this.routeParams = {}
      this.lastResolvePathParams = {}
    } else if (route === matchedRoute && matchedRouteResult) {
      this.consumedSegments = matchedRouteResult.consumedSegments
      this.lastResolvePathParams = { ...matchedRouteResult.params }
      if (this.parent === null) {
        this.routeParams = { ...matchedRouteResult.params }
      }
    } else {
      this.consumedSegments = remainingPaths.length > 0 ? 1 : 0
      this.routeParams = {}
      this.lastResolvePathParams = {}
    }
    if (typeof route.redirectTo === 'function') {
      const to = this.cloneNavigatorParams(this.getNavigatorParams())
      const from = this.lastResolvedParams
        ? this.cloneNavigatorParams(this.lastResolvedParams)
        : null
      const p = route.redirectTo({
        to,
        from,
        router: this,
        params: this.lastResolvePathParams
      })
      if (typeof p === 'string') {
        this.assertRedirectTarget(pathname, p)
        this.navigateTo(p)
      } else if (typeof p === 'object') {
        this.assertRedirectTarget(pathname, p.pathname)
        this.navigateTo(p.pathname, p.queryParams, p.hash)
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
    this.lastResolvedParams = this.cloneNavigatorParams(this.getNavigatorParams())
    return route
  }
}
