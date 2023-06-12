import {
  Injectable,
  JSXChildNode,
  onDestroy,
  provide,
  useSignal
} from '@viewfly/core'
import { RouteContext, useRouteContext } from './router-context'
import { formatRoute as formatRouteConfig } from './utils'
import { Observable, Subject } from '@tanbo/stream'
import {
  RouteConfig,
  RouteOutletConfig,
  RouterChangeEvent,
  History,
  Location
} from './router.interface'
import { BrowserHistory, BrowserLocation } from './platform-browser/browser-router'

@Injectable()
export class Router {
  onChange: Observable<RouterChangeEvent>

  private _changeEvent = new Subject<RouterChangeEvent>()

  constructor(private history: History) {
    this.onChange = this._changeEvent.asObservable()
  }

  navigate(to: string, state?: any) {
    this.history.pushState(state, '', to)

    this._changeEvent.next({
      path: to,
      state
    })
  }
}

export function RouterProvider(config: {
  children?: JSXChildNode
}) {
  const injector = provide([
    RouteContext,
    Router,
    {
      provide: History,
      useClass: BrowserHistory
    },
    {
      provide: Location,
      useClass: BrowserLocation
    }
  ])

  // 这个是顶层的路由上下文，是负责传达路由变化的起点
  const topContext = injector.get(RouteContext)
  const router = injector.get(Router)
  const location = injector.get(Location)

  updateTopContext(location.pathname, null)

  router.onChange.subscribe(event => {
    updateTopContext(event.path, event.state)
    topContext.makeChange()
  })

  function updateTopContext(path = '/', state: any) {
    topContext.pathname = path
    topContext.state = state
  }

  return () => {
    return (
      <>
        {config.children}
      </>
    )
  }
}


export function RouteOutlet(props: RouteOutletConfig) {
  const [context, childContext] = useRouteContext()

  const config = formatRouteConfig(props.config)
  const displayConfig = useSignal<RouteConfig | null>(consumePathname())

  /**
   * 路由匹配处理
   */
  function consumePathname() {
    // 先写个简单的匹配，真正的匹配肯定复杂多了
    const target = config.find(routeConfig => {
      return context.pathname.startsWith(routeConfig.path)
    })

    // 吞掉路由路径已经匹配完成的部分
    if (target) {
      childContext.pathname = context.pathname.slice(target.path.length - 1)
    }

    return target || null
  }

  const subscription = context.onChange.subscribe(() => {
    const target = consumePathname()
    if (target) {
      childContext.makeChange()
    }

    displayConfig.set(target)
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  return () => {
    console.log('route change: ', displayConfig())
    return (
      <>
        {displayConfig()?.component}
      </>
    )
  }
}