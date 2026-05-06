import { createSignal } from '@viewfly/core'

/** 子组件 A：蓝色边框 + 独立表单状态 */
export function FormPanelA() {
  console.info('[pg-hmr] FormPanelA setup() 执行')
  const name = createSignal('')
  let innerRenders = 0
  return () => {
    innerRenders += 1
    console.info(`[pg-hmr] FormPanelA viewRender() 第 ${innerRenders} 次`)
    return (
      <section class="pg-panel pg-panel--a">
        <h2 class="pg-panelTitle">子组件 A（蓝）</h2>
        <p class="pg-counter">内层渲染次数：{innerRenders}</p>
        <div class="pg-field">
          <span class="pg-label">名称</span>
          <input
            class="pg-input"
            type="text"
            placeholder="仅本区块状态"
            value={name()}
            onInput={(ev: Event) => name.set((ev.target as HTMLInputElement).value)}
          />
        </div>
        <p class="pg-hint">改本组件源码并保存，观察 B/C 的计数是否不变。</p>
      </section>
    )
  }
}
