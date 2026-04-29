import {
  ComponentSetup,
  createContext,
  inject,
  JSXNode,
  makeError,
  onUnmounted,
  Props,
  shallowReactive,
  watch,
} from '@viewfly/core'
import { microTask } from '@tanbo/stream'

import { Navigator, NavigatorParams, Route, Router, Routes } from './providers/_api'

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
  let confirmedParams: NavigatorParams | null = null

  // 用 microTask 合并同回合内多次 refresh，再跑一次 updateChildren（避免 generation 被连加踩爆）
  const subscription = router.onRefresh.pipe(microTask()).subscribe(() => {
    void updateChildren()
  })

  /** 每次 `updateChildren` 调用递增；并发/卸载时旧的一次性任务应放弃写 UI */
  let navigationGeneration = 0

  onUnmounted(() => {
    navigationGeneration += 1
    subscription.unsubscribe()
  })

  let activateRoute: Route | null = null
  watch(() => props.name, () => {
    activateRoute = null
    void updateChildren()
  })
  watch(() => props.children, () => {
    if (activateRoute) {
      return
    }
    void updateChildren()
  })

  function isStaleNavigation(token: number) {
    return token !== navigationGeneration
  }

  function getNavigatorParams(): NavigatorParams {
    const pathname = '/' + navigator.urlTree.paths.join('/')
    return {
      pathname: pathname === '/' ? pathname : pathname.replace(/\/+/g, '/'),
      queryParams: navigator.urlTree.queryParams,
      hash: navigator.urlTree.hash
    }
  }

  async function updateChildren() {
    const token = (navigationGeneration += 1)
    const to = getNavigatorParams()

    const route = router!.resolve(routes)
    if (!route) {
      navigator.confirmNavigation()
      confirmedParams = to
      activateRoute = null
      children.value = props.children || null
      return
    }
    if (route === activateRoute) {
      navigator.confirmNavigation()
      confirmedParams = to
      childRouter.refresh()
      return
    }
    if (typeof route.canActivate === 'function') {
      const ok = await route.canActivate({
        to,
        from: confirmedParams,
        router: childRouter
      })
      if (isStaleNavigation(token)) {
        return
      }
      if (!ok) {
        navigator.cancelNavigation()
        return
      }
    }
    await applyRoute(route, token)
    if (isStaleNavigation(token)) {
      return
    }
    navigator.confirmNavigation()
    confirmedParams = to
  }

  async function applyRoute(route: Route, token: number) {
    let Component: ComponentSetup | null = null

    if (props.name) {
      const namedComponents = route.namedComponents || []
      for (const named of namedComponents) {
        if (named.name === props.name) {
          if (named.component) {
            Component = named.component
          } else if (typeof named.asyncComponent === 'function') {
            Component = await named.asyncComponent()
            if (isStaleNavigation(token)) {
              return
            }
          }
          break
        }
      }
    } else if (route.component) {
      Component = route.component
    } else if (typeof route.asyncComponent === 'function') {
      Component = await route.asyncComponent()
      if (isStaleNavigation(token)) {
        return
      }
      if (!Component) {
        activateRoute = null
        children.value = props.children || null
        return
      }
    }

    if (!Component) {
      Component = RouterOutlet
    }

    let subRoutes: Route[] = []
    if (route.path !== '*') {
      if (Array.isArray(route.children)) {
        subRoutes = route.children
      } else if (typeof route.children === 'function') {
        subRoutes = await route.children()
        if (isStaleNavigation(token)) {
          return
        }
      }
    }

    if (!Array.isArray(subRoutes)) {
      subRoutes = []
    }

    const Context = createContext([{
      provide: Routes,
      useValue: subRoutes
    }])

    if (isStaleNavigation(token)) {
      return
    }

    activateRoute = route

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
