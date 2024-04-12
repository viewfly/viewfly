import {
  ComponentSetup,
  inject,
  InjectFlags,
  JSXNode,
  makeError,
  onUnmounted,
  Props, reactive,
  SkipSelf,
  withAnnotation
} from '@viewfly/core'

import { Navigator, RouteConfig, Router } from './providers/_api'

const routerErrorFn = makeError('RouterOutlet')

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
  const children = reactive<{value: JSXNode | JSXNode[] | null}>({
    value: null
  })

  const router = inject(Router, null, InjectFlags.SkipSelf)
  const childRouter = inject(Router)

  if (router === null) {
    throw routerErrorFn('cannot found parent Router.')
  }

  const subscription = router.onRefresh.subscribe(() => {
    updateChildren()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  let currentComponent: ComponentSetup | null = null

  function updateChildren() {
    const result = router!.consumeConfig(props.config)
    if (!result) {
      currentComponent = null
      children.value = props.children || null
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

  function _updateChildren(Component: ComponentSetup, remainingPath: string) {
    childRouter.refresh(remainingPath)
    if (Component !== currentComponent) {
      children.value = <Component/>
    }

    currentComponent = Component
  }

  updateChildren()

  return () => {
    return <>{children.value}</>
  }
})
