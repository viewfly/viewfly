import { viewfly, ViewFlyNode, Application, Config, NativeNode } from '@viewfly/core'
import { DomRenderer } from './dom-renderer'

/**
 * 创建一个 Viewfly 实例
 * @param root 应用根节点
 * @param autoUpdate 是否自动更新视图，默认为 true，当值为 false 时，Viewfly
 * 只会首次渲染，直到手动调用 app 的 render() 方法，这在单元测试中非常有用，
 * 我们无需等待 Viewfly 默认的异步调度，实现同步更新视图
 * ```tsx
 * const app = createApp(<App/>, false).mount(document.getElementById('app'))
 *
 * // do something...
 *
 * app.render() // 手动更新视图
 * ```
 */
export function createApp<T extends NativeNode>(root: ViewFlyNode, autoUpdate?: boolean): Application<T>
export function createApp<T extends NativeNode>(root: ViewFlyNode, config?: Partial<Omit<Config, 'root'>>): Application<T>
export function createApp<T extends NativeNode>(root: ViewFlyNode, config: any = true): Application<T> {
  const c: Partial<Config> = { autoUpdate: true }
  if (typeof config === 'boolean') {
    c.autoUpdate = config
  } else if (typeof config === 'object') {
    Object.assign(c, config)
  }
  return viewfly<T>({
    ...c,
    root,
    nativeRenderer: c.nativeRenderer || new DomRenderer(),
  })
}
