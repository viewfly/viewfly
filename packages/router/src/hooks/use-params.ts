import { comparePropsWithCallbacks, inject, internalWrite, onUnmounted, readonlyProxyHandler } from '@viewfly/core'
import { Router } from '../providers/router'

export function useParams<T extends Record<string, string>>(): T {
  const router = inject(Router)

  const params: Record<string, string> = { ...router.params }
  const readonlyParams = new Proxy(params, readonlyProxyHandler)
  const subscription = router.onRefresh.subscribe(() => {
    comparePropsWithCallbacks(params, router.params, key => {
      internalWrite(() => {
        Reflect.deleteProperty(params, key)
      })
    }, (key, value) => {
      internalWrite(() => {
        params[key] = value
      })
    }, (key, value) => {
      internalWrite(() => {
        params[key] = value
      })
    })
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  return readonlyParams as T
}
