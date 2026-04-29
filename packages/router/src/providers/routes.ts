import { ComponentSetup, InjectionToken } from '@viewfly/core'
import { NavigatorParams } from './navigator'
import type { Router } from './router'

/** URL path 上由 `:param` 解析得到的键值（与查询串 `queryParams` 区分） */
export type Params = Record<string, string>

export interface CanActivateContext {
  to: NavigatorParams
  from: NavigatorParams | null
  router: Router
  params: Params
}

export interface RedirectContext {
  to: NavigatorParams
  from: NavigatorParams | null
  router: Router
  params: Params
}

export interface NamedRouteComponent {
  name: string
  component?: ComponentSetup
  asyncComponent?: () => Promise<ComponentSetup>
}

export interface Route {
  path: string
  component?: ComponentSetup
  children?: Route[] | (() => Promise<Route[]>)
  namedComponents?: NamedRouteComponent[]
  asyncComponent?: () => Promise<ComponentSetup>

  canActivate?(context: CanActivateContext): boolean | Promise<boolean>

  redirectTo?: string | ((context: RedirectContext) => string | NavigatorParams)
}

export const Routes = new InjectionToken<Route[]>('Routes')
