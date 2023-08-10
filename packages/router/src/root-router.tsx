import { Props, onUnmounted, provide, JSXInternal } from '@viewfly/core'

import { Navigator, BrowserNavigator, Router } from './providers/_api'

export interface RootRouterProps extends Props {
  basePath?: string
  children?: JSXInternal.JSXNode
}

export function RootRouter(props: RootRouterProps) {
  const basePath = props.basePath || ''
  const navigator = new BrowserNavigator(basePath)

  function getPath() {
    const pathname = navigator.pathname

    return pathname.startsWith(basePath) ? pathname.substring(basePath.length) : pathname
  }

  const router = new Router(
    navigator,
    null,
    getPath()
  )

  provide([
    {
      provide: Navigator,
      useValue: navigator
    },
    {
      provide: Router,
      useValue: router
    }
  ])

  const subscription = navigator.onUrlChanged.subscribe(() => {
    router.refresh(getPath())
  })

  onUnmounted(() => {
    subscription.unsubscribe()
    navigator.destroy()
  })

  return () => {
    return <>{props.children}</>
  }
}
