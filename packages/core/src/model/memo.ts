import { Props } from './jsx-element'
import { JSXInternal } from './types'

export function withMemo<T extends Props = Props>(
  shouldUpdate: JSXInternal.ComponentInstance<T>['$shouldUpdate'],
  render: () => JSXInternal.Element
): JSXInternal.ComponentInstance<T> {
  return {
    $shouldUpdate: shouldUpdate,
    $render: render
  }
}
