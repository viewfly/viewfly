import { useSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'


function create() {
  return {
    id: Math.random(),
    name: Math.random().toString(16)
  }
}

const data = useSignal(Array.from({ length: 10 }).map(() => {
  return create()
}))

function List(props: any) {
  return () => {
    return <li>
      <span>{props.item.name}</span>
      <button onClick={() => {
        const list = data()
        const index = list.indexOf(props.item)
        list.splice(index, 1)
        data.set([...list])
      }}>delete
      </button>
      <button onClick={() => {
        const list = data()
        const index = list.indexOf(props.item)
        list.splice(index + 1, 0, create())
        data.set([...list])
      }}>add
      </button>
    </li>
  }
}

function App() {
  return () => {
    return (
      <ul>
        <div>
          <button onClick={() => {
            const list = data()
            const a = list[1]
            const b = list[list.length - 2]
            list[1] = b
            list[list.length - 2] = a
            data.set([...list])
          }}>swap
          </button>
        </div>
        {
          data().map(item => {
            return (
              <List key={item.id} item={item}/>
            )
          })
        }
      </ul>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
