import { Injectable } from '@tanbo/di'
import { History, Location } from '../router.interface'

@Injectable()
export class BrowserHistory extends History {
  override get length() {
    return this.history.length
  }

  override get scrollRestoration() {
    return this.history.scrollRestoration
  }

  override set scrollRestoration(value: ScrollRestoration) {
    this.history.scrollRestoration = value
  }

  override get state() {
    return this.history.state
  }

  private history = globalThis.history

  back(): void {
    this.history.back()
  }

  forward() {
    this.history.forward()
  }

  go(delta?: number | undefined) {
    this.history.go(delta)
  }

  pushState(data: any, unused: string, url?: string | URL | null | undefined) {
    this.history.pushState(data, unused, url)
  }

  replaceState(data: any, unused: string, url?: string | URL | null | undefined) {
    this.history.pushState(data, unused, url)
  }
}

@Injectable()
export class BrowserLocation extends Location {
  private location = globalThis.location

  override assign(url: string | URL) {
    this.location.assign(url)
  }
  override reload() {
    this.location.reload()
  }
  override replace(url: string | URL) {
    this.location.replace(url)
  }
}