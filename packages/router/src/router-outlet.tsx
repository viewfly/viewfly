import { inject, Props, onDestroy, provide, useSignal, JSXInternal } from '@viewfly/core'
import { Navigator, RouteConfig, Router } from './providers/_api'

export interface RouterOutletProps extends Props {
  configs: RouteConfig[]
}

export function RouterOutlet(props: RouterOutletProps) {
  const { configs } = props

  const matchedComponent = useSignal<JSXInternal.Element | JSXInternal.Element[] | null>(null)

  const parentRouter = inject(Router)
  const navigator = inject(Navigator)

  const router = new Router(navigator, parentRouter)

  provide({
    provide: Router,
    useValue: router
  })

  const subscription = parentRouter.onRefresh.subscribe(() => {
    updateChildren()
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  let currentComponent: JSXInternal.ElementClass | null = null

  function updateChildren() {
    const result = parentRouter.consumeConfig(configs)
    if (!result) {
      currentComponent = null
      matchedComponent.set(null)
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
    router.refresh(remainingPath)
    if (Component !== currentComponent) {
      matchedComponent.set(<Component />)
    }

    currentComponent = Component
  }

  updateChildren()

  return () => {
    return (
      <>
        {matchedComponent()}
      </>
    )
  }
}
