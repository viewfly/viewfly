import { Injectable } from '@viewfly/core'
import {
  fromEvent,
  Observable,
  Subject,
  Subscription
} from '@tanbo/stream'

import { Router } from './router'

export interface QueryParams {
  [key: string]: string | string[]
}

export abstract class Navigator {
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

  private urlChangeEvent = new Subject<void>()
  private subscription = new Subscription()

  constructor(baseUrl: string) {
    super(baseUrl)
    this.onUrlChanged = this.urlChangeEvent.asObservable()
    this.subscription.add(fromEvent(window, 'popstate').subscribe(() => {
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

    let beforePath = relative.beforePath
    while (true) {
      if (pathname.startsWith('./')) {
        pathname = pathname.substring(2)
        continue
      }

      if (pathname.startsWith('../')) {
        pathname = pathname.substring(3)
        if (relative.parent) {
          beforePath = relative.parent.beforePath
          relative = relative.parent
        } else {
          beforePath = ''
        }
        if (!beforePath) {
          break
        }
        continue
      }
      break
    }

    return formatUrl(this.baseUrl + '/' + beforePath + '/' + pathname, { queryParams, fragment })
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
}
