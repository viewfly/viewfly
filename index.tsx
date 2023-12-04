import { createApp, createPortal } from '@viewfly/platform-browser'
import { createSignal } from '@viewfly/core'

function App() {
  const number = createSignal(0)

  setInterval(() => {
    number.set(number() + 1)
  }, 5000)

  const ModalPortal = function (props) {
    const a = createSignal(11)
    setInterval(() => {
      a.set(Math.random())
    }, 500)
    return createPortal(() => {
      return <div class="modal">parent data is {props.text} {a()}</div>
    }, document.body)
  }
  return () => {
    return (
      <div>
        <div>data is {number()}</div>
        <ModalPortal text={number()}/>
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
