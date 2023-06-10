import { JSXChildNode, provide } from '@viewfly/core'
import { RouteContext } from '../router-context'

export function createBrowserRouter() {
  return function ({ children }: { children?: JSXChildNode }) {
    const injector = provide([
      RouteContext,
      {
        provide: History,
        useValue: globalThis.history
      },
      {
        provide: Location,
        useValue: globalThis.location
      }
    ])

    const context = injector.get(RouteContext)
    // const history = injector.get(History)
    const location = injector.get(Location)
    // hash 变化处理

    // pathname变化处理，此时页面刷新，路由组件也将重载，直接取值便可
    context.pathname = location.pathname
    // console.log('Path name: ', pathname)
    // console.log('Base name: ', basename)

    return () => {
      return (
        <>
          {children}
        </>
      )
    }
  }
}
