import { shallowReactive } from '@viewfly/core'

const state = shallowReactive({ count: 0 })

/** 默认打开的本地试验页：可在此随意改 JSX 与逻辑做手动验证 */
export function LocalTestPage() {
  return () => {
    return (
      <div class="py-4">
        <h1 class="h3 mb-3">本地测试</h1>
        <p class="text-secondary mb-4">
          在 <code class="small">src/pages/local-test.tsx</code> 里改这段 UI 即可快速试 reactive / 组件行为。
        </p>
        <div class="card card-body mb-3" style={{ maxWidth: '420px' }}>
          <p class="mb-2">计数：{state.count}</p>
          <button
            type="button"
            class="btn btn-outline-primary btn-sm"
            onClick={() => { state.count++ }}
          >
            +1
          </button>
        </div>
      </div>
    )
  }
}
