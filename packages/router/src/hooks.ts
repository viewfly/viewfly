import { inject } from '@viewfly/core'
import { Router } from './providers/router'

export function useRouter() {
  return inject(Router)
}