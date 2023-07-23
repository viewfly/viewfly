import { inject, Props, onDestroy, provide, useSignal, JSXInternal } from '@viewfly/core'
import { Navigator, Router } from './providers/_api'
import { MatchResult, Matcher, RouteConfig } from './router.interface'
import { match as _match } from 'path-to-regexp'

interface RouterOutletProps extends Props {
  config: RouteConfig[]
}

export function RouterOutlet(props: RouterOutletProps) {
  const { config } = props
  const matchers: Matcher[] = config.map(config => {
    return {
      match: _match(config.path),
      record: config
    }
  })

  const matchedComponent = useSignal<JSXInternal.Element | JSXInternal.Element[] | null>(null)

  const router = inject(Router)
  const navigator = inject(Navigator)

  const childRouter = new Router(navigator, router)

  // test code
  childRouter.id = router.id + '-1'

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

  function match(path: string): MatchResult | null {
    for (const matcher of matchers) {
      const result = matcher.match(path)
      if (result) {
        return {
          params: result.params as Record<string, string>,
          path: result.path,
          record: matcher.record
        }
      }
    }

    return null
  }

  function updateChildren() {
    console.log('router id: ', router.id)
    const result = match(router.currentPath)
    if (!result) {
      currentComponent = null
      console.log('before set: ', matchedComponent())
      matchedComponent.set(props.children || null)
      return
    }

    const record = result.record
    const matchingRouteComponent = record.component

    if (matchingRouteComponent instanceof Promise) {
      matchingRouteComponent.then(result => _updateChildren(result))
    } else {
      _updateChildren(matchingRouteComponent)
    }

    console.log('match result: ', result)

    childRouter.updateParams(result.params)
    childRouter.refresh(router.currentPath.substring(result.path.length))
  }

  function _updateChildren(Component: JSXInternal.ElementClass) {
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
