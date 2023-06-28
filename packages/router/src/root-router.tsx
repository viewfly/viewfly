import {
  JSXChildNode,
  JSXProps,
  onDestroy,
  provide
} from '@viewfly/core'
import { Navigator, BrowserNavigator, Router } from './providers/_api'

export interface RootRouterProps extends JSXProps {
  basePath?: string
  children?: JSXChildNode
}

export function RootRouter(props: RootRouterProps) {
  const basePath = props.basePath || ''
  const navigator = new BrowserNavigator(basePath)

  function getAfterPath() {
    let afterPath = navigator.pathname
    if (afterPath.startsWith(basePath)) {
      afterPath = afterPath.substring(basePath.length)
    }
    return afterPath
  }

  const router = new Router(
    navigator,
    null,
    getAfterPath()
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
    router.refresh(getAfterPath())
  })

  onDestroy(() => {
    subscription.unsubscribe()
    navigator.destroy()
  })

  return () => {
    return <>{props.children}</>
  }
}
