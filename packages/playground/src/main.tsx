import './index.css'

import { Portal, reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

function App() {
  const m = reactive({ inPlace: false })

  return () => {
    const parent = document.querySelector<HTMLDivElement>('#p-sandwich')
    const container = m.inPlace && parent ? parent : document.body

    return (
      <div class="p-3">
        <h6 class="mb-2">Portal 顺序调试（body / 原地）</h6>
        <div class="d-flex gap-2 mb-2">
          <button
            class={!m.inPlace ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary'}
            onClick={() => {
              m.inPlace = false
            }}
          >
            body
          </button>
          <button
            class={m.inPlace ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline-primary'}
            onClick={() => {
              m.inPlace = true
            }}
          >
            自身父节点（#p-sandwich）
          </button>
        </div>

        <div class="small text-secondary mb-2">
          当前 container: <code>{m.inPlace ? '#p-sandwich' : 'document.body'}</code>
        </div>

        <div id="p-sandwich" class="border rounded p-2">
          <em id="before-sandwich" class="me-1">front</em>
          <Portal container={container}>
            <b id="portal-sandwich">P</b>
          </Portal>
          <i id="after-sandwich" class="ms-1">back</i>
        </div>
      </div>
    )
  }
}

createApp(<App/>).mount(document.querySelector('#main')!)
