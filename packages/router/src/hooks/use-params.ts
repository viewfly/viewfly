import { comparePropsWithCallbacks, inject, internalWrite, onUnmounted, readonlyProxyHandler } from '@viewfly/core'
import { Params } from '../providers/routes'
import { Router } from '../providers/router'

export function useParams<T extends Params = Params>(): T {
  const router = inject(Router)

  const pathParams: Params = { ...router.params }
  const readonlyParams = new Proxy(pathParams, readonlyProxyHandler)
  const subscription = router.onRefresh.subscribe(() => {
    comparePropsWithCallbacks(pathParams, router.params, key => {
      internalWrite(() => {
        Reflect.deleteProperty(pathParams, key)
      })
    }, (key, value) => {
      internalWrite(() => {
        pathParams[key] = value
      })
    }, (key, value) => {
      internalWrite(() => {
        pathParams[key] = value
      })
    })
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return readonlyParams as T
}
