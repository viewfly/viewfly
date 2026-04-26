import { reactive, watchEffect } from '@viewfly/core'

/** 默认打开的本地试验页：可在此随意改 JSX 与逻辑做手动验证 */
export function LocalTestPage() {
  const debug = reactive({
    obj: { a: 1 } as { a: number, b?: number },
    objectKeysCounter: 0,
    objectKeysLogs: [] as string[]
  })

  let objectKeysRuns = 0

  watchEffect(() => {
    Object.keys(debug.obj)
    objectKeysRuns++
    debug.objectKeysCounter = objectKeysRuns
  })

  function resetObjectKeysScenario() {
    debug.obj = { a: 1 }
    objectKeysRuns = 0
    debug.objectKeysCounter = 0
    debug.objectKeysLogs.length = 0
  }

  function runObjectKeysAddCase() {
    const before = `[before] obj=${JSON.stringify(debug.obj)} objectKeysCounter=${debug.objectKeysCounter}`
    debug.obj.b = 2
    const after = `[after]  obj=${JSON.stringify(debug.obj)} objectKeysCounter=${debug.objectKeysCounter}`
    debug.objectKeysLogs.unshift(before, after)
  }

  return () => {
    return (
      <section class="d-flex flex-column gap-2">
        <h5 class="mb-0">Object.keys 新增属性调试</h5>
        <div class="text-muted">
          场景对应测试：`Object.keys(obj)` 建立依赖后执行 `obj.b = 2`，
          观察 effect 计数是否变化。
        </div>
        <div>当前对象：{JSON.stringify(debug.obj)}</div>
        <div>objectKeysCounter: {debug.objectKeysCounter}</div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm" onClick={runObjectKeysAddCase}>执行 obj.b = 2</button>
          <button class="btn btn-outline-secondary btn-sm" onClick={resetObjectKeysScenario}>重置场景</button>
        </div>
        <div>
          <div class="mb-1">调试日志（新在上）</div>
          <pre class="border rounded p-2 bg-light" style="min-height: 120px">{debug.objectKeysLogs.join('\n')}</pre>
        </div>
      </section>
    )
  }
}
