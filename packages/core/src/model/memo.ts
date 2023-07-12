import { JSXChildNode, Props } from './jsx-element'
import { ComponentInstance } from './component';

export interface ShouldUpdate<T extends Props> {
  (currentProps: T, prevProps: T): unknown
}

export function withMemo<T extends Props = Props>(
  shouldUpdate: ShouldUpdate<T>,
  render: () => JSXChildNode
): ComponentInstance<T> {
  return {
    $shouldUpdate: shouldUpdate,
    $render: render
  }
}
