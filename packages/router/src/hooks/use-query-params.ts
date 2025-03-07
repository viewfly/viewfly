import { createSignal, inject, onUnmounted } from '@viewfly/core'

import { Router } from '../providers/router'
import { Navigator } from '../providers/navigator'
import { UrlQueryParams } from '../providers/url-parser'

export function useQueryParams<T extends UrlQueryParams>() {
  const router = inject(Router)
  const navigator = inject(Navigator)
  const queryParams = createSignal<T>(navigator.urlTree.queryParams as T)
  const subscription = router.onRefresh.subscribe(() => {
    queryParams.set(navigator.urlTree.queryParams as T)
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })
  return queryParams
}
