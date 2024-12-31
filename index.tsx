import { createApp } from '@viewfly/platform-browser'
import { reactive, shallowReactive } from '@viewfly/core'

function Child(props: any) {
  return () => {
    console.log(props)
    return (
      <div>
        {props.children}
      </div>
    )
  }
}

function App() {
  const map = reactive(new Map<string, {name: string}>())

  let i = 0
  return () => {
    return (
      <div>
        {
          Array.from(map.values()).map((item) => {
            console.log(item)
            return (
              <div>
                <p>{item.name}</p>
                <div>
                  <button onClick={() => {
                    item.name = Math.random().toString(16)
                  }}>
                    changeName
                  </button>
                </div>
              </div>
            )
          })
        }
        <Child>
          <div>{map.size}</div>
        </Child>
        <div>
          <button onClick={() => {
            map.set('test' + i, { name: Math.random().toString() })
            i++
          }}>add
          </button>
        </div>
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
