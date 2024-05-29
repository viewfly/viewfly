import { createSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

function Child(props: any) {
  return () => {
    return props.test ? (
      <h1>111</h1>
    ) : [
      <h2>222</h2>,
      <h3>333</h3>
    ]
  }
}

function App() {
  const test = createSignal(false)
  return () => {
    return (
      <div>
        {
          test() ? <strong>strong</strong> : [<em>test</em>, <i>iii</i>]
        }
        <Child test={test()}/>
        <button onClick={() => {
          test.set(!test())
        }}>btn
        </button>
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
