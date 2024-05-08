import { createSignal, inject, InjectFlags, onUnmounted, Props, SkipSelf, withAnnotation } from '@viewfly/core'

import { Navigator, RouteConfig, Router } from './providers/_api'

export interface RouterOutletProps extends Props {
  config: RouteConfig[]
}

export const RouterOutlet = withAnnotation({
  providers: [{
    provide: Router,
    useFactory(navigator: Navigator, router: Router) {
      return new Router(navigator, router, '')
    },
    deps: [
      [Navigator],
      [Router, new SkipSelf()]
    ]
  }]
}, function RouterOutlet(props: RouterOutletProps) {
  const children = createSignal<JSXInternal.Element | JSXInternal.Element[] | null>(null)

  const router = inject(Router, InjectFlags.SkipSelf)
  const childRouter = inject(Router)

  const subscription = router.onRefresh.subscribe(() => {
    updateChildren()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  let currentComponent: JSXInternal.ComponentSetup | null = null

  function updateChildren() {
    const result = router.consumeConfig(props.config)
    if (!result) {
      currentComponent = null
      children.set(props.children || null)
      return
    }

    const { routeConfig, remainingPath } = result
    if (routeConfig.component) {
      _updateChildren(routeConfig.component, remainingPath)
    } else if (routeConfig.asyncComponent) {
      routeConfig.asyncComponent().then(c => {
        _updateChildren(c, remainingPath)
      })
    }
  }

  function _updateChildren(Component: JSXInternal.ComponentSetup, remainingPath: string) {
    childRouter.refresh(remainingPath)
    if (Component !== currentComponent) {
      children.set(<Component/>)
    }

    currentComponent = Component
  }

  updateChildren()

  return () => {
    return <>{children()}</>
  }
})
