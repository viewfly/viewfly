import type { Component } from '../base/component'

let setupRerunHandler: ((component: Component) => void) | null = null

/**
 * 由 `createRenderer` 在创建渲染器时注册；后注册的覆盖先前的（与多根场景一致）。
 * @internal
 */
export function registerComponentSetupRerunHandler(
  handler: ((component: Component) => void) | null,
): void {
  setupRerunHandler = handler
}

/**
 * 对已在树上的组件执行与框架内部 HMR 相同的 setup 重跑与视图更新。
 *
 * 仅在通过 `createRenderer` 挂载的应用内有效；未注册处理器时为 no-op。
 */
export function rerunComponentSetup(component: Component): void {
  setupRerunHandler?.(component)
}
