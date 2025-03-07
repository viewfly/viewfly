import { Application, Module } from '@viewfly/core'
import { Subscription } from '@tanbo/stream'

import { BrowserNavigator, Navigator, NavigatorHooks } from './providers/navigator'
import { Router } from './providers/router'

export class RouterModule implements Module {
  private subscription = new Subscription()
  private navigator: BrowserNavigator

  constructor(public baseUrl = '', hooks: NavigatorHooks = {}) {
    this.navigator = new BrowserNavigator(this.baseUrl, hooks)
  }

  setup(app: Application) {
    const navigator = this.navigator
    const router = new Router(
      navigator,
      null,
    )

    this.subscription.add(
      navigator.onUrlChanged.subscribe(() => {
        router.refresh()
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
