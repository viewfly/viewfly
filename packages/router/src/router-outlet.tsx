import { Component, inject, Props, onDestroy, provide, useSignal, JSXInternal } from '@viewfly/core'

import { Navigator, RouteConfig, Router } from './providers/_api'

export interface RouterOutletProps extends Props {
  config: RouteConfig[]
}

export function RouterOutlet(props: RouterOutletProps) {
  const children = useSignal<JSXInternal.Element | JSXInternal.Element[] | null>(null)

  const router = inject(Router)
  const childRouter = new Router(inject(Navigator), router, '')

  provide({
    provide: Router,
    useValue: childRouter
  })

  const subscription = router.onRefresh.subscribe(() => {
    updateChildren()
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  let currentComponent: JSXInternal.ElementClass | null = null

  function updateChildren() {
    const result = router.consumeConfig(props.config)
    if (!result) {
      currentComponent = null
      children.set(props.children || null)
      return
    }

    const { routeConfig, remainingPath } = result
    const matchingRouteComponent = routeConfig.component

    if (matchingRouteComponent instanceof Promise) {
      matchingRouteComponent.then(result => _updateChildren(result, remainingPath))
    } else {
      _updateChildren(matchingRouteComponent, remainingPath)
    }
  }

  function _updateChildren(Component: JSXInternal.ElementClass, remainingPath: string) {
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
}
