import './index.css'

import { onMounted, Portal, reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

function App() {
  const viewModel = reactive({
    scrollY: 0,
    active: false,
  })

  onMounted(() => {
    const onScroll = () => {
      const y = Math.round(window.scrollY)
      viewModel.scrollY = y
      viewModel.active = y > 80
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  })

  return () => {
    return (
      <div class="p-3">
        <h6 class="mb-2">Portal + 页面滚动属性更新演示</h6>
        <div class="small text-secondary mb-2">
          Portal 固定挂到 <code>document.body</code>，滚动页面可看到 Portal 内容节点属性变化。
        </div>
        <div class="small mb-3">
          当前滚动：<code>{viewModel.scrollY}px</code>
        </div>
        <div style={{ height: '1800px', paddingTop: '8px' }}>
          向下滚动页面，观察右上角浮层的 data 属性和 class 变化。
        </div>

        <Portal container={document.body}>
          <div
            id="portal-scroll-demo"
            data-scroll-y={String(viewModel.scrollY)}
            data-scroll-active={String(viewModel.active)}
            class={viewModel.active ? 'bg-danger text-white' : 'bg-dark text-white'}
            style={{
              position: 'fixed',
              top: '12px',
              right: '12px',
              zIndex: 9999,
              padding: '8px 12px',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0,0,0,.2)',
              transition: 'all .2s ease',
            }}
          >
            Portal 浮层 · y={viewModel.scrollY}px
          </div>
        </Portal>
      </div>
    )
  }
}

createApp(<App/>).mount(document.querySelector('#main')!)
