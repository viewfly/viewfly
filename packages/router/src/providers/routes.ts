import { ComponentSetup, InjectionToken } from '@viewfly/core'
import { NavigatorParams } from './navigator'
import type { Router } from './router'

export interface CanActivateContext {
  to: NavigatorParams
  from: NavigatorParams
  router: Router
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

  redirectTo?: string | ((path: string) => string | NavigatorParams)
}

export const Routes = new InjectionToken<Route[]>('Routes')
