import { createSignal } from '@viewfly/core'

/** 子组件 C：琥珀色边框 */
export function FormPanelC() {
  console.info('[pg-hmr] FormPanelC setup() 执行')
  const note = createSignal('')
  let innerRenders = 0
  return () => {
    innerRenders += 1
    console.info(`[pg-hmr] FormPanelC viewRender() 第 ${innerRenders} 次`)
    return (
      <section class="pg-panel pg-panel--c">
        <h2 class="pg-panelTitle">子组件 C（琥珀）</h2>
        <p class="pg-counter">内层渲染次数：{innerRenders}</p>
        <div class="pg-field">
          <span class="pg-label">备注</span>
          <textarea
            class="pg-input pg-textarea"
            placeholder="多行输入"
            value={note()}
            onInput={(ev: Event) => note.set((ev.target as HTMLTextAreaElement).value)}
          />
        </div>
        <p class="pg-hint">三个区块互为兄弟子组件，便于对比子树更新范围。</p>
      </section>
    )
  }
}
