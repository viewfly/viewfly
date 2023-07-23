import { Props, onDestroy, provide, JSXInternal } from '@viewfly/core'
import { Navigator, BrowserNavigator, Router } from './providers/_api'

export interface RootRouterProps extends Props {
  basePath?: string
  children?: JSXInternal.JSXChildNode
}

export function RootRouter(props: RootRouterProps) {
  const basePath = props.basePath || ''
  const navigator = new BrowserNavigator(basePath)

  const topRouter = new Router(
    navigator,
    null,
    navigator.pathname
  )

  // test code
  topRouter.id = 'top'

  provide([
    {
      provide: Navigator,
      useValue: navigator
    },
    {
      provide: Router,
      useValue: topRouter
    }
  ])

  const subscription = navigator.onUrlChanged.subscribe(() => {
    topRouter.refresh(navigator.pathname)
  })

  onDestroy(() => {
    subscription.unsubscribe()
    navigator.destroy()
  })

  return () => {
    return <>{props.children}</>
  }
}
