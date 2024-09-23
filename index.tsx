import { createDerived, createSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

import './index.scss'
const arr = Array.from({ length: 5 }).map((_, index) => {
  return {
    label: index,
    id: 'id' + index
  }
})

const rows = createSignal(arr)

function Box() {
  const a = Math.random()
  return () => {
    return (
      <div>test{a}</div>
    )
  }
}

function ListItem(props: any) {
  return () => {
    return (
      <>
        <p>{props.children}</p>
        <Box/>
      </>
    )
  }
}

function App() {
  return () => {
    return (
      <div>
        {
          rows().map(item => {
            return (
              <ListItem key={item.id}>{item.label}</ListItem>
            )
          })
        }
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)

// const li = document.querySelectorAll('li')[1]
// li.classList.add('test')

document.onclick = function () {

  const li1 = arr[1]
  const li3 = arr[3]

  arr[1] = li3
  arr[3] = li1

  rows.set(arr.slice())
}
