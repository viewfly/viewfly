import { inject } from '@viewfly/core'
import { Router } from './router'

export function useHistory() {
  return inject(History)
}

export function useLocation() {
  return inject(Location)
}

export function useRouter() {
  return inject(Router)
}