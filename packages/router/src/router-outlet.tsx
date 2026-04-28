import {
  createContext,
  inject,
  JSXNode,
  makeError,
  onUnmounted,
  Props,
  shallowReactive,
} from '@viewfly/core'

import { Navigator, Route, Router, Routes } from './providers/_api'

const routerErrorFn = makeError('RouterOutlet')

export function RouterOutlet(props: Props) {
  const router = inject(Router, null)
  if (router === null) {
    throw routerErrorFn('cannot found parent Router.')
  }
  const routes = inject(Routes, [])
  const navigator = inject(Navigator)
  const childRouter = new Router(navigator, router)


  const Context = createContext([{
    provide: Router,
    useValue: childRouter
  }])
  const children = shallowReactive<{value: JSXNode | JSXNode[] | null}>({
    value: null
  })

  const subscription = router.onRefresh.subscribe(() => {
    updateChildren()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  let activateRoute: Route | null = null

  async function updateChildren() {
    const route = router!.resolve(routes)
    if (!route) {
      activateRoute = null
      children.value = props.children || null
      return
    }
    if (route === activateRoute) {
      childRouter.refresh()
      return
    }
    if (typeof route.beforeEach === 'function') {
      const is = await route.beforeEach()
      if (!is) {
        return
      }
    }
    applyRoute(route)
    if (typeof route.afterEach === 'function') {
      route.afterEach()
    }
  }

  async function applyRoute(route: Route) {
    const Component = route.component ? route.component :
      route.asyncComponent ? await route.asyncComponent() : null
    if (!Component) {
      children.value = props.children || null
      return
    }
    let subRoutes: Route[] = []
    if (Array.isArray(route.children)) {
      subRoutes = route.children
    } else if (typeof route.children === 'function') {
      subRoutes = await route.children()
    }

    if (!Array.isArray(subRoutes)) {
      subRoutes = []
    }

    const Context = createContext([{
      provide: Routes,
      useValue: subRoutes
    }])

    children.value = (
      <Context>
        <Component/>
      </Context>
    )
  }

  updateChildren()

  return () => {
    return <Context>{children.value}</Context>
  }
}
