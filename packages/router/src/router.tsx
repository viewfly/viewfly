import {
  JSXChildNode,
  onDestroy,
  useSignal
} from '@viewfly/core'
import { RouteOutletConfig } from './router.interface'
import { useRouteContext } from './router-context'
import { formatRoute as formatRouteConfig } from './utils'

export function RouteOutlet(props: RouteOutletConfig) {
  const [context, childContext] = useRouteContext()
  const currentComponent = useSignal<JSXChildNode>(null)

  const config = formatRouteConfig(props.config)

  /**
   * 路由匹配处理
   * 吞掉对应的路由路径
   */
  function consumePathname() {
    // 先写个简单的匹配，真正的匹配肯定复杂多了
    const target = config.find(routeConfig => {
      return context.pathname.startsWith(routeConfig.path)
    })

    currentComponent.set(target ? target.component : null)

    if (target) {
      childContext.pathname = context.pathname.slice(target.path.length - 1)
    }
  }

  consumePathname()

  const subscription = context.onChange.subscribe(() => {
    consumePathname()
    childContext.makeChange()
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  console.log('pathname: ', context.pathname)

  return () => {
    return (
      <>
        {currentComponent()}
      </>
    )
  }
}