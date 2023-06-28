import {
  ComponentSetup,
  inject,
  JSXChildNode,
  JSXProps,
  onDestroy,
  provide,
  useSignal
} from '@viewfly/core'
import { Navigator, RouteConfig, Router } from './providers/_api'

export interface RouterOutletProps extends JSXProps {
  config: RouteConfig[]
}

export function RouterOutlet(props: RouterOutletProps) {
  const children = useSignal<JSXChildNode | JSXChildNode[] | null>(null)

  const router = inject(Router)
  const subRouter = new Router(inject(Navigator), router, '')

  provide({
    provide: Router,
    useValue: subRouter
  })

  const subscription = router.onRefresh.subscribe(() => {
    setChildren()
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  let currentComponent: ComponentSetup | null = null

  function setChildren() {
    const config = router.getSubViewAndAfterPath(props.config)
    if (!config) {
      currentComponent = null
      children.set(props.children || null)
      return
    }

    const { subView, afterPath } = config

    if (subView.component instanceof Promise) {
      subView.component.then(Component => {
        if (Component === currentComponent) {
          subRouter.refresh(afterPath)
        } else {
          children.set(<Component />)
        }

        currentComponent = Component
      })
    } else {
      const C = subView.component
      if (C === currentComponent) {
        subRouter.refresh(afterPath)
      } else {
        children.set(<C />)
      }

      currentComponent = C
    }
  }

  setChildren()

  return () => {
    return <>{children()}</>
  }
}
