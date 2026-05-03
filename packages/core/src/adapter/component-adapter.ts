import type { Component } from '../base/component'

/**
 * 可选的开发期适配层（如 HMR、DevTools），由独立包注册；生产环境不注册则无运行时开销。
 */
export interface ComponentAdapter {
  onComponentMounted?(component: Component): void
  onComponentDestroyed?(component: Component): void
  /**
   * 每个 `createRenderer` 调用时会注册一次；后注册的覆盖先前的（与多根场景一致）。
   */
  registerRerenderHandler?(handler: (component: Component) => void): void
}

let adapter: ComponentAdapter | null = null

export function setComponentAdapter(next: ComponentAdapter | null): void {
  adapter = next
}

export function getComponentAdapter(): ComponentAdapter | null {
  return adapter
}

/** @internal */
export function notifyComponentMounted(component: Component): void {
  adapter?.onComponentMounted?.(component)
}

/** @internal */
export function notifyComponentDestroyed(component: Component): void {
  adapter?.onComponentDestroyed?.(component)
}

/** @internal */
export function registerRerenderHandler(handler: (component: Component) => void): void {
  adapter?.registerRerenderHandler?.(handler)
}
