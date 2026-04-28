import { Application, Module } from '@viewfly/core'
import { Subscription } from '@tanbo/stream'

import { BrowserNavigator, Navigator, NavigatorHooks } from './providers/navigator'
import { Router } from './providers/router'
import { Route, Routes } from './providers/routes'

export interface RouterConfig {
  baseUrl?: string
  routes?: Route[]
  hooks?: NavigatorHooks
}

export class RouterModule implements Module {
  private subscription = new Subscription()
  private navigator: BrowserNavigator

  constructor(public config: RouterConfig) {
    this.navigator = new BrowserNavigator(config.baseUrl || '', config.hooks)
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
      }, {
        provide: Routes,
        useValue: this.config.routes || []
      }
    ])
  }

  onDestroy() {
    this.subscription.unsubscribe()
    this.navigator.destroy()
  }
}
