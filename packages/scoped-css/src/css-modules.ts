import { applyMark, JSXNode } from '@viewfly/core'

/**
 * 给组件的视图元素节点添加作用域 css 标记
 * @deprecated 即将弃用，为统一 API 风格，请使用 @viewfly/core 模块的 withMark 实现
 * @param cssNamespace
 * @param render
 * @example
 * ```tsx
 * function App() {
 *   return withScopedCSS('css-scoped-id', () => {
 *     return <div>...</div>
 *   })
 * }
 * ```
 */
export function withScopedCSS(cssNamespace: string | string[], render: () => JSXNode): () => JSXNode {
  if (!cssNamespace) {
    return render
  }
  return function () {
    return applyMark(cssNamespace, render)
  }
}

