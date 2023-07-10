import { JSXChildNode, Props } from './jsx-element'

export interface ShouldUpdate<T extends Props> {
  (currentProps: T, prevProps: T): unknown
}

export class Memo<T extends Props> {
  constructor(public shouldUpdate: ShouldUpdate<T>, public render: () => JSXChildNode) {
  }
}

export function withMemo<T extends Props = Props>(shouldUpdate: ShouldUpdate<T>, render: () => JSXChildNode) {
  return new Memo(shouldUpdate, render)
}
