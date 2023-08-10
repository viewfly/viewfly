import {
  fromEvent,
  Observable,
  Subject,
  Subscription
} from '@tanbo/stream'
import { RouterContext } from './router-context'
import { SearchParams } from '../interface'
import { normalizePath } from '../utils'

export abstract class Location {
  abstract get pathname(): string
  abstract get hash(): string
  abstract get search(): string
}

export abstract class Navigator {
  abstract get location(): Location

  protected constructor(public base: string) { }

  abstract onUrlChanged: Observable<void>

  abstract to(pathname: string, relative: RouterContext, queryParams?: SearchParams): boolean
  abstract replace(pathname: string, relative: RouterContext, queryParams?: SearchParams): void
  abstract resolveRelative(pathname: string, relative: RouterContext, queryParams?: SearchParams): string
  abstract back(): void
  abstract forward(): void
  abstract go(offset: number): void
  abstract destroy(): void
}

export class BrowserLocation extends Location {
  get pathname() {
    return this.url.pathname
  }
  get hash() {
    return this.url.hash
  }
  get search() {
    return this.url.search
  }

  private origin = 'https://viewfly.org'
  private url = new URL(this.origin)

  constructor() {
    super()
  }

  regenerate() {
    const {
      pathname,
      search,
      hash
    } = window.location

    try {
      this.url = new URL(this.origin + pathname + search + hash)
    } catch (error) {
      throw new Error('Invalid path for location: ' + JSON.stringify(error))
    }
  }
}

export class BrowserNavigator extends Navigator {
  get location() {
    return this._location
  }

  onUrlChanged: Observable<void>

  private urlChangeEvent = new Subject<void>()
  private subscription = new Subscription()

  private _location: BrowserLocation

  constructor(base = '/') {
    super(base)

    this._location = new BrowserLocation()
    this.onUrlChanged = this.urlChangeEvent.asObservable()

    this.subscription.add(fromEvent(window, 'popstate').subscribe(() => this.afterUrlChange()))
  }

  state() {
    return window.history.state()
  }

  to(pathname: string, relative: RouterContext, search?: SearchParams) {
    const url = this.resolveRelative(pathname, relative, search)

    if (location.origin + url === location.href) {
      return true
    }

    history.pushState(null, '', url)
    this.afterUrlChange()

    return true
  }

  replace(pathname: string, relative: RouterContext, search?: SearchParams) {
    const url = this.resolveRelative(pathname, relative, search)
    if (location.origin + url === location.href) {
      return
    }

    window.history.replaceState(null, '', url)
    this.afterUrlChange()
  }

  /**
   * resolve relative path 
   * 
   * example: ./destination or ../destination
   * 
   * @param path 
   * @param context 
   * @param search 
   * @returns 
   */
  resolveRelative(path: string, context: RouterContext, search?: SearchParams): string {
    if (path.startsWith('/')) {
      return normalizePath(this.base + path, search)
    }

    let beforePath = context.beforePath
    let currentContext: RouterContext | null = context
    while (currentContext) {
      if (path.startsWith('./')) {
        path = path.substring(2)
        continue
      }

      if (path.startsWith('../')) {
        path = path.substring(3)

        if (currentContext.parent) {
          beforePath = currentContext.parent.beforePath
          currentContext = currentContext.parent
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

    return normalizePath(this.base + '/' + beforePath + '/' + path, search)
  }

  back() {
    window.history.back()
  }

  forward() {
    window.history.forward()
  }

  go(offset: number) {
    window.history.go(offset)
  }

  destroy() {
    this.subscription.unsubscribe()
  }

  private afterUrlChange() {
    this._location.regenerate()
    this.urlChangeEvent.next()
  }
}