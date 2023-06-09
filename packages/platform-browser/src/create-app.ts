import { Viewfly, NativeRenderer, JSXTemplate } from '@viewfly/core'
import { DomRenderer } from './dom-renderer'

/**
 * 创建一个 Viewfly 实例
 * @param host 应用根节点
 * @param root 应用根组件，需要注意的是，必须为一个函数，并返回组件或虚拟 DOM
 * @param autoUpdate 是否自动更新视图，默认为 true，当值为 false 时，Viewfly
 * 只会首次渲染，直到手动调用 Renderer 类的 refresh() 方法，这在单元测试中非常有用，
 * 我们无需等待 Viewfly 默认的异步调度，实现同步更新视图
 * ```tsx
 * const app = createApp(document.getElementById('app'), () => <App/>, false)
 * const renderer = app.get(Renderer)
 *
 * // do something...
 *
 * renderer.refresh() // 手动更新视图
 * ```
 */
export function createApp(host: HTMLElement, root: () => JSXTemplate, autoUpdate = true) {
  const app = new Viewfly({
    host,
    root,
    autoUpdate,
    providers: [
      {
        provide: NativeRenderer,
        useClass: DomRenderer
      }
    ]
  })

  app.start()
  return app
}
