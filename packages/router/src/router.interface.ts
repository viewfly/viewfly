import { JSXInternal } from '@viewfly/core'
import { MatchFunction } from 'path-to-regexp'

export interface RouteConfig {
  path: string
  component: JSXInternal.ElementClass | Promise<JSXInternal.ElementClass>

  beforeEach?(): boolean | Promise<boolean>
}

export interface Matcher {
  match: MatchFunction
  record: RouteConfig
}

export interface MatchResult {
  path: string
  params: Record<string, string>
  record: RouteConfig
}
