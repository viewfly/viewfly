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

  let currentComponent: JSXInternal.ComponentSetup | null = null

  function updateChildren() {
    const result = parentRouter.consumeConfig(configs)
    if (!result) {
      currentComponent = null
      matchedComponent.set(null)
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
