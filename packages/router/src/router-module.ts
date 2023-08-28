import { Application, Module } from '@viewfly/core'
import { Subscription } from '@tanbo/stream'

import { BrowserNavigator, Navigator } from './providers/navigator'
import { Router } from './providers/router'

export class RouterModule implements Module {
  private subscription = new Subscription()
  private navigator = new BrowserNavigator(this.baseUrl)

  constructor(public baseUrl = '') {
  }

  setup(app: Application) {
    const baseUrl = this.baseUrl
    const navigator = this.navigator

    function getPath() {
      const pathname = navigator.pathname

      return pathname.startsWith(baseUrl) ? pathname.substring(baseUrl.length) : pathname
    }

    const router = new Router(
      navigator,
      null,
      getPath()
    )

    this.subscription.add(
      navigator.onUrlChanged.subscribe(() => {
        router.refresh(getPath())
      })
    )
    app.provide([
      {
        provide: Navigator,
        useValue: navigator
      },
      {
        provide: Router,
        useValue: router
      }
    ])
  }

  onDestroy() {
    this.subscription.unsubscribe()
    this.navigator.destroy()
  }
}
