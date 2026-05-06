import { createSignal } from '@viewfly/core'

/** 子组件 B：绿色边框 */
export function FormPanelB() {
  console.info('[pg-hmr] FormPanelB setup() 执行')
  const email = createSignal('')
  let innerRenders = 0
  return () => {
    innerRenders += 1
    console.info(`[pg-hmr] FormPanelB viewRender() 第 ${innerRenders} 次`)
    return (
      <section class="pg-panel pg-panel--b">
        <h2 class="pg-panelTitle">子组件 B（绿）</h2>
        <p class="pg-counter">内层渲染次数：{innerRenders}</p>
        <div class="pg-field">
          <span class="pg-label">邮箱</span>
          <input
            class="pg-input"
            type="email"
            placeholder="独立表单"
            value={email()}
            onInput={(ev: Event) => email.set((ev.target as HTMLInputElement).value)}
          />
        </div>
        <p class="pg-hint">热更仅应触及被修改文34件对应的组件。</p>
      </section>
    )
  }
}
