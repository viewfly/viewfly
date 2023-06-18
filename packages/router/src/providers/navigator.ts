import { Injectable } from '@viewfly/core'
import { format } from 'url'
import { fromEvent, Observable, Subject, Subscription } from '@tanbo/stream'

import { Router } from './router'

export interface QueryParams {
  [key: string]: string | string[]
}

export abstract class Navigator {
  protected constructor(public basePath: string) {
  }

  abstract onUrlChanged: Observable<void>

  abstract get pathname(): string

  abstract to(pathName: string, relative: Router, queryParams?: QueryParams): boolean

  abstract join(pathName: string, relative: Router, queryParams?: QueryParams): string

  abstract back(): void

  abstract forward(): void

  abstract go(offset: number): void

  abstract destroy(): void
}

@Injectable()
export class BrowserNavigator extends Navigator {
  onUrlChanged: Observable<void>

  get pathname() {
    return location.pathname
  }

  private urlChangeEvent = new Subject<void>()

  private subscription = new Subscription()

  constructor(basePath: string) {
    super(basePath)
    this.onUrlChanged = this.urlChangeEvent.asObservable()
    this.subscription.add(fromEvent(window, 'popstate').subscribe(() => {
      this.urlChangeEvent.next()
    }))
  }

  to(pathName: string, relative: Router, queryParams?: QueryParams) {
    const url = this.join(pathName, relative, queryParams)
    if (location.origin + url === location.href) {
      return true
    }
    history.pushState(null, '', this.basePath + url)
    this.urlChangeEvent.next()
    return true
  }

  join(pathname: string, relative: Router, queryParams?: QueryParams): string {
    let beforePath = relative.beforePath
    if (pathname.startsWith('/')) {
      return format({
        pathname,
        query: queryParams
      })
    }
    while (true) {
      if (pathname.startsWith('./')) {
        pathname = pathname.substring(2)
        continue
      }
      if (pathname.startsWith('../')) {
        pathname = pathname.substring(3)
        beforePath = relative.parent?.beforePath || ''
        if (!beforePath) {
          break
        }
        continue
      }
      break
    }
    return format({
      pathname: beforePath + '/' + pathname,
      query: queryParams
    })
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
