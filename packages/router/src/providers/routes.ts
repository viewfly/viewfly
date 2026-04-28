import { ComponentSetup, InjectionToken } from '@viewfly/core'
import { NavigatorParams } from './navigator'

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

  beforeEach?(): boolean | Promise<boolean>

  afterEach?(): void

  redirectTo?: string | ((path: string) => string | NavigatorParams)
}

export const Routes = new InjectionToken<Route[]>('Routes')
