import { ComponentSetup, InjectionToken } from '@viewfly/core'
import { NavigatorParams } from './navigator'

export interface Route {
  path: string
  component?: ComponentSetup
  children?: Route[] | (() => Promise<Route[]>)
  asyncComponent?: () => Promise<ComponentSetup>

  beforeEach?(): boolean | Promise<boolean>

  afterEach?(): void

  redirectTo?: string | ((path: string) => string | NavigatorParams)
}

export const Routes = new InjectionToken<Route[]>('Routes')
