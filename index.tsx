import { createDynamicRef } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

function Child() {
  return {
    show() {
      return 'sss'
    },
    $render() {
      return (
        <div>fdsfdsa</div>
      )
    }
  }
}

function App() {
  const ref = createDynamicRef<typeof Child>(e => {
    e.show()
  })
  return () => {
    return (
      <div>
        <input type="text" onChange={() => {
        }}/>
        <Child ref={ref}/>
        <img src="" alt=""/>
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
