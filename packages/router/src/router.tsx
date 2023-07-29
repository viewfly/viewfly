import { onDestroy, provide, inject } from '@viewfly/core'
import { RouterConfig } from './interface'
import { RouterContext } from './providers/router-context'
import { BrowserNavigator, Location, Navigator } from './providers/navigator'

export function useRouter() {
  return inject(RouterContext)
}

export function useNavigator() {
  return inject(Navigator)
}

export function useLocation() {
  return inject(Location)
}

export function Router(config: RouterConfig) {
  const { base, children } = config

  const navigator = config.navigator || new BrowserNavigator(base)
  const routerContext = new RouterContext(null, navigator)
  const location = navigator.location

  provide([
    {
      provide: Navigator,
      useValue: navigator
    },
    {
      provide: RouterContext,
      useValue: routerContext
    },
    {
      provide: Location,
      useValue: location
    }
  ])

  const subscription = navigator.onUrlChanged.subscribe(() => {
    routerContext.refresh(location.pathname, {})
  })

  onDestroy(() => {
    subscription.unsubscribe()
    navigator.destroy()
  })

  return () => {
    return <>{children}</>
  }
}