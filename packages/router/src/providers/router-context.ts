import { Observable, Subject } from '@tanbo/stream'
import { SearchParams } from '../interface'
import { Navigator } from './navigator'

export class RouterContext {
  onRefresh: Observable<void>

  get beforePath() {
    return this.parent ?
      (this.parent.beforePath + '/' + this._pathSegment) :
      this._pathSegment
  }

  get pathSegment() {
    return this._pathSegment
  }

  get params() {
    return this._params
  }

  private refreshEvent = new Subject<void>()

  private _params: SearchParams = {}
  private _pathSegment: string = ''

  constructor(
    public parent: RouterContext | null = null,
    private navigator: Navigator
    ) {
    this.onRefresh = this.refreshEvent.asObservable()
  }

  to(path: string, search?: SearchParams) {
    this.navigator.to(path, this, search)
  }

  replace(path: string, search?: SearchParams) {
    this.navigator.replace(path, this, search)
  }

  refresh(segment: string, params: SearchParams) {
    this._pathSegment = segment
    this._params = params
    this.refreshEvent.next()
  }
}
