import { comparePropsWithCallbacks, inject, internalWrite, onUnmounted, readonlyProxyHandler } from '@viewfly/core'

import { Router } from '../providers/router'
import { Navigator } from '../providers/navigator'
import { UrlQueryParams } from '../providers/url-parser'

export function useQueryParams<T extends UrlQueryParams>(): T {
  const router = inject(Router)
  const navigator = inject(Navigator)
  const params: Record<string, any> = { ...navigator.urlTree.queryParams as T }
  const queryParams = new Proxy(params, readonlyProxyHandler)
  const subscription = router.onRefresh.subscribe(() => {
    comparePropsWithCallbacks(params, navigator.urlTree.queryParams, key => {
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
  return queryParams as T
}
