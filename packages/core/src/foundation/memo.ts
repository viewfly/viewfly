import { Props } from './jsx-element'
import { ComponentInstance, JSXNode } from './component'

export function withMemo<T extends Props = Props>(
  canUseMemo: ComponentInstance<T>['$useMemo'],
  render: () => JSXNode
): ComponentInstance<T> {
  return {
    $useMemo: canUseMemo,
    $render: render
  }
}
