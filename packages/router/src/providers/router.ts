import { Observable, Subject } from '@tanbo/stream'
import { Navigator, QueryParams } from './navigator'

export interface RouteConfig {
  name: string
  component?: JSXInternal.ComponentSetup
  asyncComponent?: () => Promise<JSXInternal.ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>
}

export class Router {
  onRefresh: Observable<void>

  /**
   * 这里之后要讨论一下
   */
  get pathname() {
    if (this.parent) {
      const name = this.parent.path.match(/[^\/?#]+/)
      if (name) {
        return name[0]
      }
    }

    return ''
  }

  get beforePath() {
    if (this.parent) {
      return this.parent.beforePath + '/' + this.pathname
    }

    return ''
  }

  get currentPath() {
    return this.path
  }

  get params() {
    return this._params
  }

  private refreshEvent = new Subject<void>()

  private _params: Record<string, string> = {}

  constructor(
    private navigator: Navigator,
    public parent: Router | null,
    private path = ''
  ) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  updateParams(params: Record<string, string>) {
    this._params = params
  }

  navigateTo(path: string, params?: QueryParams) {
    this.navigator.to(path, this, params)
  }

  replaceTo(path: string, params?: QueryParams) {
    this.navigator.replace(path, this, params)
  }

  refresh(path: string) {
    this.path = path
    this.refreshEvent.next()
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
}
