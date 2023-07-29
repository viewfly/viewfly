import { inject, onDestroy, provide, useSignal, JSXInternal } from '@viewfly/core'
import { MatchResult, Matcher, OutletConfig, SearchParams } from './interface'
import { match as _match } from 'path-to-regexp'
import { RouterContext } from './providers/router-context'
import { Navigator } from './providers/navigator'

export function Outlet(config: OutletConfig) {
  const { routes } = config

  const matchers: Matcher[] = routes.map(route => {
    return {
      match: _match(route.path),
      record: route
    }
  })

  const matchedComponent = useSignal<JSXInternal.Element | JSXInternal.Element[] | null>(null)

  const router = inject(RouterContext)
  const navigator = inject(Navigator)
  const childRouter = new RouterContext(router, navigator)

  provide({
    provide: RouterContext,
    useValue: childRouter
  })

  const subscription = router.onRefresh.subscribe(() => {
    updateChildren()
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  let currentComponent: JSXInternal.ElementClass | null = null

  function match(path: string): MatchResult | null {
    for (const matcher of matchers) {
      const result = matcher.match(path)
      if (result) {
        return {
          params: result.params as SearchParams,
          path: result.path,
          record: matcher.record
        }
      }
    }

    return null
  }

  function updateChildren() {
    const result = match(router.pathSegment)
    if (!result) {
      currentComponent = null
      matchedComponent.set(config.children || null)
      return
    }

    const record = result.record
    const matchingRouteComponent = record.component

    if (matchingRouteComponent instanceof Promise) {
      matchingRouteComponent.then(result => _updateChildren(result))
    } else {
      _updateChildren(matchingRouteComponent)
    }

    childRouter.refresh(
      router.pathSegment.substring(result.path.length),
      result.params
    )
  }

  function _updateChildren(Component: JSXInternal.ElementClass) {
    if (Component !== currentComponent) {
      matchedComponent.set(<Component />)
    }

    currentComponent = Component
  }

  updateChildren()

  return () => {
    return <>{matchedComponent()}</>
  }
}
