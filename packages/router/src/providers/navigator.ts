import { Injectable } from '@viewfly/core'
import {
  fromEvent,
  Observable,
  Subject,
  Subscription
} from '@tanbo/stream'

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

  abstract to(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string): boolean

  abstract replace(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string): boolean

  abstract join(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string): string

  abstract back(): void

  abstract forward(): void

  abstract go(offset: number): void


  abstract destroy(): void
}

export interface UrlFormatParams {
  queryParams?: QueryParams
  fragment?: string
}

export function formatUrl(pathname: string, urlFormatParams: UrlFormatParams) {
  pathname = pathname.replace(/\/+/g, '/')
  const { queryParams, fragment } = urlFormatParams
  return pathname + (queryParams ? '?' + formatQueryParams(queryParams) : '') + (fragment ? '#' + fragment : '')
}

export function formatQueryParams(queryParams: QueryParams) {
  const params: string[] = []

  Object.keys(queryParams).forEach(key => {
    const values = queryParams[key]
    if (Array.isArray(values)) {
      values.forEach(i => {
        params.push(`${key}=${decodeURIComponent(i)}`)
      })
    } else {
      params.push(`${key}=${decodeURIComponent(values)}`)
    }
  })
  return params.join('&')
}

@Injectable()
export class BrowserNavigator extends Navigator {
  onUrlChanged: Observable<void>

  get pathname() {
    return location.pathname
  }


  private urlParser = new UrlParser()
  urlTree = this.getUrlTree()

  private urlChangeEvent = new Subject<void>()
  private subscription = new Subscription()

  constructor(baseUrl: string) {
    super(baseUrl)
    this.onUrlChanged = this.urlChangeEvent.asObservable()
    this.subscription.add(fromEvent(window, 'popstate').subscribe(() => {
      this.urlTree = this.getUrlTree()
      this.urlChangeEvent.next()
    }))
    if (!this.pathname.startsWith(this.baseUrl)) {
      history.replaceState(null, '', this.baseUrl)
    }
  }

  to(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string) {
    const url = this.join(pathName, relative, queryParams, fragment)
    if (location.origin + url === location.href) {
      return true
    }

    history.pushState(null, '', url)
    this.urlChangeEvent.next()
    return true
  }

  replace(pathName: string, relative: Router, queryParams?: QueryParams, fragment?: string) {
    const url = this.join(pathName, relative, queryParams, fragment)
    if (location.origin + url === location.href) {
      return true
    }

    history.replaceState(null, '', url)
    this.urlChangeEvent.next()
    return true
  }

  join(pathname: string, relative: Router, queryParams?: QueryParams, fragment?: string): string {
    if (pathname.startsWith('/')) {
      return formatUrl(this.baseUrl + pathname, { queryParams, fragment })
    }

    const beforePath = this.urlTree.paths.slice(0, relative.deep + 1)
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

    return formatUrl(this.baseUrl + '/' + beforePath.join('/') + '/' + pathname, { queryParams, fragment })
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

  destroy() {
    this.subscription.unsubscribe()
  }

  private getUrlTree() {
    const pathname = this.pathname
    return this.urlParser.parse(pathname.startsWith(this.baseUrl) ? pathname.substring(this.baseUrl.length) : pathname + location.search + location.hash)
  }
}
