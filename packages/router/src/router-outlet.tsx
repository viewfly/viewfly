import {
  ComponentSetup,
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

export interface RouterOutletProps extends Props {
  name?: string
}

export function RouterOutlet(props: RouterOutletProps) {
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
      navigator.confirmNavigation()
      activateRoute = null
      children.value = props.children || null
      return
    }
    if (route === activateRoute) {
      navigator.confirmNavigation()
      childRouter.refresh()
      return
    }
    if (typeof route.canActivate === 'function') {
      const ok = await route.canActivate()
      if (!ok) {
        navigator.cancelNavigation()
        return
      }
    }
    applyRoute(route)
    navigator.confirmNavigation()
  }

  async function applyRoute(route: Route) {
    let Component: ComponentSetup | null = null

    if (props.name) {
      const namedComponents = route.namedComponents || []
      for (const named of namedComponents) {
        if (named.name === props.name) {
          if (named.component) {
            Component = named.component
          } else if (typeof named.asyncComponent === 'function') {
            Component = await named.asyncComponent()
          }
          break
        }
      }
    } else if (route.component) {
      Component = route.component
    } else if (typeof route.asyncComponent === 'function') {
      Component = await route.asyncComponent()
    }

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
