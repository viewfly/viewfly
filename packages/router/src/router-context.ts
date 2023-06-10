import { Injectable } from '@tanbo/di'
import { Observable, Subject } from '@tanbo/stream'
import { inject, provide } from '@viewfly/core'

@Injectable()
export class RouteContext {
  get pathname() {
    return this._pathname
  }

  set pathname(value: string) {
    this._pathname = value
  }

  onChange: Observable<void>

  private _changeEvent = new Subject<void>()
  private _pathname = ''

  constructor() {
    this.onChange = this._changeEvent.asObservable()
  }

  makeChange() {
    this._changeEvent.next()
  }
}

export function useRouteContext() {
  const currentContext = inject(RouteContext)
  const childContext = provide(RouteContext).get(RouteContext)

  return [currentContext, childContext]
}