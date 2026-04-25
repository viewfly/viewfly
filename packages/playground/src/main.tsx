import { createApp } from '@viewfly/platform-browser'

import './index.css'
import { createContext, createDynamicRef, Portal, reactive } from '@viewfly/core'

function App() {

  const viewModel = reactive({
    show: false,
    count: 1
  })
  const ref = createDynamicRef(node => {
    console.log(node)
    setTimeout(() => {
      viewModel.count++
    })
    return () => {
      console.log('destroy')
    }
  })

  const Context = createContext([])

  return () => {
    return (
      <div style={{
        width: '400px',
        margin: '0 auto',
      }}>
        <div>
          <div>{viewModel.count}</div>
          <Portal host={document.body}>
            <Context>
              {viewModel.show && <p ref={ref}>ppp</p>}
            </Context>
          </Portal>
        </div>
        <button onClick={() => viewModel.show = !viewModel.show}>btn</button>
        <button onClick={() => viewModel.count++}>+</button>
      </div>
    )
  }
}

createApp(<App/>).mount(document.querySelector('#main')!)
