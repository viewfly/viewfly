import { Injectable } from '@viewfly/core'
import {
  fromEvent,
  Observable,
  Subject,
  Subscription
} from '@tanbo/stream'

import { encodeQueryParamComponent } from './query-encoding'
import { Router } from './router'
import { UrlParser, UrlTree } from './url-parser'

export interface QueryParams {
  [key: string]: string | string[]
}

export abstract class Navigator {
  abstract urlTree: UrlTree

  protected constructor(public baseUrl: string) {
  }

  abstract onUrlChanged: Observable<void>

  abstract get pathname(): string

  abstract to(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string | null): boolean

  abstract replace(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string | null): boolean

  abstract join(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string | null): string

  abstract back(): void

  abstract forward(): void

  abstract go(offset: number): void

  /** 当前一次由 Router 触发的地址变更已被对应页面接受 */
  abstract confirmNavigation(): void

  /** 当前一次由 Router 触发的地址变更被页面守卫拒绝，需要回滚地址栏 */
  abstract cancelNavigation(): void


  abstract destroy(): void
}

export interface UrlFormatParams {
  queryParams?: QueryParams
  fragment?: string | null
}

export function formatUrl(pathname: string, urlFormatParams: UrlFormatParams) {
  pathname = pathname.replace(/\/+/g, '/')
  const { queryParams, fragment } = urlFormatParams
  return pathname
    + (queryParams ? '?' + formatQueryParams(queryParams) : '')
    + (fragment !== undefined && fragment !== null ? '#' + fragment : '')
}

export function formatQueryParams(queryParams: QueryParams) {
  const params: string[] = []

  Object.keys(queryParams).forEach(key => {
    const encKey = encodeQueryParamComponent(key)
    const values = queryParams[key]
    if (Array.isArray(values)) {
      values.forEach(i => {
        params.push(`${encKey}=${encodeQueryParamComponent(i)}`)
      })
    } else {
      params.push(`${encKey}=${encodeQueryParamComponent(values)}`)
    }
  })
  return params.join('&')
}

export interface NavigatorParams {
  pathname: string
  queryParams: QueryParams
  fragment: string | null
}

export interface NavigatorHooks {
  beforeEach?(currentParams: NavigatorParams, nextParams: NavigatorParams, next: () => void): void

  afterEach?(params: NavigatorParams): void
}

@Injectable()
export class BrowserNavigator extends Navigator {
  onUrlChanged: Observable<void>
  private pendingNavigation: {
    type: 'push' | 'replace'
    from: string
  } | null = null

  /** 挂载在 location 上的路径前缀；'' 或 '/' 表示站点根，不做剥离 */
  private get basePathPrefix() {
    return this.baseUrl === '/' || this.baseUrl === '' ? '' : this.baseUrl
  }

  get pathname() {
    return this.stripBaseFromLocationPathname(location.pathname)
  }

  private urlParser = new UrlParser()
  urlTree = this.readUrlTreeFromLocation()

  private urlChangeEvent = new Subject<void>()
  private subscription = new Subscription()

  constructor(baseUrl: string, private hooks: NavigatorHooks = {}) {
    super(baseUrl)
    this.onUrlChanged = this.urlChangeEvent.asObservable()
    this.subscription.add(fromEvent(window, 'popstate').subscribe(() => {
      this.urlTree = this.readUrlTreeFromLocation()
      this.urlChangeEvent.next()
    }))
    if (this.basePathPrefix && !location.pathname.startsWith(this.basePathPrefix)) {
      history.replaceState(null, '', this.baseUrl)
      this.urlTree = this.readUrlTreeFromHistoryHref(this.baseUrl)
    }
  }

  to(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string | null) {
    const url = this.join(pathName, relative, queryParams, fragment)
    if (location.origin + url === location.href) {
      return true
    }

    this.runHooks({
      pathname: this.pathname,
      queryParams: this.urlTree.queryParams,
      fragment: this.urlTree.hash
    }, {
      pathname: pathName,
      queryParams: queryParams || {},
      fragment: fragment ?? null
    }, () => {
      this.pendingNavigation = {
        type: 'push',
        from: this.getCurrentUrl()
      }
      history.pushState(null, '', url)
      this.urlTree = this.readUrlTreeFromHistoryHref(url)
      this.urlChangeEvent.next()
    })

    return true
  }

  replace(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string | null) {
    const url = this.join(pathName, relative, queryParams, fragment)
    if (location.origin + url === location.href) {
      return true
    }
    this.runHooks({
      pathname: this.pathname,
      queryParams: this.urlTree.queryParams,
      fragment: this.urlTree.hash
    }, {
      pathname: pathName,
      queryParams: queryParams || {},
      fragment: fragment ?? null
    }, () => {
      this.pendingNavigation = {
        type: 'replace',
        from: this.getCurrentUrl()
      }
      history.replaceState(null, '', url)
      this.urlTree = this.readUrlTreeFromHistoryHref(url)
      this.urlChangeEvent.next()
    })
    return true
  }

  join(pathname: string, relative: Router, queryParams?: QueryParams, fragment?: string | null): string {
    if (pathname.startsWith('/')) {
      return formatUrl(this.baseUrl + pathname, { queryParams, fragment })
    }

    const beforePath = this.urlTree.paths.slice(0, relative.deep)
    while (true) {
      if (pathname.startsWith('./')) {
        pathname = pathname.substring(2)
        continue
      }

      if (pathname.startsWith('../')) {
        pathname = pathname.substring(3)
        beforePath.pop()
        continue
      }
      break
    }

    // 空 base 时避免拼出以 // 开头的路径（部分 URL 解析会当作协议相对地址）
    const tail = [...beforePath, pathname].join('/')
    const base = this.baseUrl.replace(/\/+$/, '')
    const merged = base ? `${base}/${tail}` : `/${tail}`
    return formatUrl(merged.replace(/\/+/g, '/'), { queryParams, fragment })
  }

  back() {
    history.back()
  }

  forward() {
    history.forward()
  }

  go(offset: number) {
    history.go(offset)
  }

  confirmNavigation() {
    this.pendingNavigation = null
  }

  cancelNavigation() {
    const pending = this.pendingNavigation
    this.pendingNavigation = null
    if (!pending) {
      return
    }
    if (pending.type === 'push') {
      history.back()
      return
    }
    history.replaceState(null, '', pending.from)
    this.urlTree = this.readUrlTreeFromHistoryHref(pending.from)
    this.urlChangeEvent.next()
  }

  destroy() {
    this.subscription.unsubscribe()
  }

  private runHooks(beforeParams: NavigatorParams, currentParams: NavigatorParams, next: () => void) {
    if (typeof this.hooks.beforeEach === 'function') {
      let called = false
      let warningTimer: ReturnType<typeof setTimeout> | null = null
      const proceed = () => {
        if (called) {
          return
        }
        called = true
        if (warningTimer) {
          clearTimeout(warningTimer)
        }
        next()
        this.hooks.afterEach?.(currentParams)
      }
      this.hooks.beforeEach?.(beforeParams, currentParams, proceed)
      const env = (globalThis as any)?.process?.env
      const isProduction = env?.env === 'production' || env?.NODE_ENV === 'production'
      if (!isProduction && !called) {
        warningTimer = setTimeout(() => {
          if (!called) {
            console.warn('[Viewfly Router] NavigatorHooks.beforeEach did not call next(); navigation remains pending.')
          }
        }, 300)
      }
    } else {
      next()
      this.hooks.afterEach?.(currentParams)
    }
  }

  private stripBaseFromLocationPathname(fullPathname: string): string {
    if (!this.basePathPrefix) {
      return fullPathname
    }
    return fullPathname.startsWith(this.basePathPrefix)
      ? fullPathname.substring(this.basePathPrefix.length)
      : fullPathname
  }

  /**
   * 按与 `history.pushState` / `replaceState` 写入会话的 URL 解析 urlTree（与传入 `join` 的相对路径一致）。
   * History 更新后若仍仅从 `Location` 读路径，可能与实际会话 URL 不一致（如 Location 与 document 的同步时序、部分宿主环境）。
   */
  private readUrlTreeFromHistoryHref(hrefRelativeToOrigin: string): UrlTree {
    const abs = new URL(hrefRelativeToOrigin, location.origin)
    const logicalPathname = this.stripBaseFromLocationPathname(abs.pathname)
    return this.urlParser.parse(`${logicalPathname}${abs.search}${abs.hash}`)
  }

  private readUrlTreeFromLocation(): UrlTree {
    return this.urlParser.parse(this.pathname + location.search + location.hash)
  }

  private getCurrentUrl() {
    return location.pathname + location.search + location.hash
  }
}
