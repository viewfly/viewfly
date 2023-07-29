import { JSXInternal, Props } from '@viewfly/core'
import { MatchFunction } from 'path-to-regexp'
import { Navigator } from './providers/navigator'

export interface Route {
  path: string
  component: JSXInternal.ElementClass

  beforeEach?(): boolean | Promise<boolean>
}

export interface Matcher {
  match: MatchFunction
  record: Route
}

export interface MatchResult {
  path: string
  record: Route
  params: SearchParams
}

export interface RouterConfig extends Props {
  base?: string
  navigator?: Navigator
}

export interface OutletConfig extends Props {
  routes: Route[]
}

export interface LinkConfig extends Props {
  to: string

  tag?: string
  active?: string
  exact?: boolean
  searchParams?: SearchParams
}

export interface SearchParams {
  [key: string]: string | string[]
}
