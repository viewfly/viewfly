import { Props } from './jsx-element'
import { JSXInternal } from './types'

export function withMemo<T extends Props = Props>(
  canUseMemo: JSXInternal.ComponentInstance<T>['$useMemo'],
  render: () => JSXInternal.JSXNode
): JSXInternal.ComponentInstance<T> {
  return {
    $useMemo: canUseMemo,
    $render: render
  }
}
