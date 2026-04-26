import { reactive, watchEffect } from '@viewfly/core'

/** 默认打开的本地试验页：可在此随意改 JSX 与逻辑做手动验证 */
export function LocalTestPage() {
  const debug = reactive({
    arr: [1, 4] as number[],
    indexCounter: 0,
    lengthCounter: 0,
    logs: [] as string[]
  })

  let indexRuns = 0
  let lengthRuns = 0

  watchEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    debug.arr[3]
    indexRuns++
    debug.indexCounter = indexRuns
  })

  watchEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    debug.arr.length
    lengthRuns++
    debug.lengthCounter = lengthRuns
  })

  function resetScenario() {
    debug.arr.splice(0, debug.arr.length, 1, 4)
    indexRuns = 0
    lengthRuns = 0
    debug.indexCounter = 0
    debug.lengthCounter = 0
    debug.logs.length = 0
  }

  function runSpliceInsertCase() {
    const before = `[before] arr=${JSON.stringify(debug.arr)} indexCounter=${debug.indexCounter} lengthCounter=${debug.lengthCounter}`
    debug.arr.splice(1, 0, 2, 3)
    const after = `[after]  arr=${JSON.stringify(debug.arr)} indexCounter=${debug.indexCounter} lengthCounter=${debug.lengthCounter}`
    debug.logs.unshift(before, after)
  }

  return () => {
    return (
      <div class="d-flex flex-column gap-3">
        <h5 class="mb-0">数组 splice 插入调试</h5>
        <div class="text-muted">
          场景对应测试：`arr = [1, 4]` 后执行 `arr.splice(1, 0, 2, 3)`，
          观察依赖 `arr[3]` 与 `arr.length` 的 effect 计数。
        </div>
        <div>当前数组：{JSON.stringify(debug.arr)}</div>
        <div class="d-flex gap-4">
          <span>indexCounter(arr[3]): {debug.indexCounter}</span>
          <span>lengthCounter(arr.length): {debug.lengthCounter}</span>
        </div>
        <div class="d-flex gap-2">
          <button class="btn btn-primary btn-sm" onClick={runSpliceInsertCase}>执行 splice(1, 0, 2, 3)</button>
          <button class="btn btn-outline-secondary btn-sm" onClick={resetScenario}>重置场景</button>
        </div>
        <div>
          <div class="mb-1">调试日志（新在上）</div>
          <pre class="border rounded p-2 bg-light" style="min-height: 140px">{debug.logs.join('\n')}</pre>
        </div>
      </div>
    )
  }
}
