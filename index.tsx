import { createSignal, onUnmounted } from '@viewfly/core'
import { createApp, createPortal } from '@viewfly/platform-browser'

const isShow = createSignal(true)
const showChild = createSignal(true)
const number = createSignal(0)

function App() {

  function Child(props) {
    return createPortal(() => {
      return props.isShow ? <p>child{number()}</p> : <>
        <div>eee{number()}</div>
        <p>test</p></>
    }, document.body)
  }

  return () => {
    return (
      <div>
        <div>
          <button onClick={() => {
            isShow.set(!isShow())
          }}>switch: {isShow() + ''}
          </button>
          <button onClick={() => {
            showChild.set(!showChild())
          }}>showChild: {showChild() + ''}
          </button>
          <button onClick={() => {
            number.set(number() + 1)
          }}>add</button>
        </div>
        {
          showChild() ? <Child isShow={isShow()}/> : 'xxx'
        }
      </div>
    )
  }
}
createApp(<App/>).mount(document.getElementById('main')!)
