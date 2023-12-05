import { createSignal, onUnmounted } from '@viewfly/core'
import { createApp, createPortal } from '@viewfly/platform-browser'

const isShow = createSignal(true)

function App() {

  function Child() {
    return createPortal(() => {
      return <p>child</p>
    }, document.body)
  }

  return () => {
    return (
      <div>
        <div>
          <button onClick={() => {
            isShow.set(!isShow())
          }}>btn</button>
        </div>
        {
          isShow() ? <Child/> : 'xxx'
        }
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
