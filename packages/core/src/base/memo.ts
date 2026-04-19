import { Props } from './jsx-element'
import { ComponentInstance, JSXNode } from './component'

/**
 * @deprecated 即将弃用，Viewfly 默认就有 memo 的效果
 * @param canUseMemo
 * @param render
 */
export function withMemo<T extends Props = Props>(
  canUseMemo: ComponentInstance<T>['$useMemo'],
  render: () => JSXNode
): ComponentInstance<T> {
  return {
    $useMemo: canUseMemo,
    $render: render
  }
}
