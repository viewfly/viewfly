import { Signal, useSignal } from '@viewfly/core';
import { useProduce } from '@viewfly/hooks'
import { createApp } from '@viewfly/platform-browser'

function App() {
  const [getState, update] = useProduce({
    name: '张三',
    age: 33
  })

  return () => {
    const state = getState()
    return (
      <div>
        <div>姓名：{state.name}</div>
        <div>年龄：{state.age}</div>
        <div>
          <div>改名字：<input type="text" value={state.name} onInput={(ev) => {
            update(draft => {
              draft.name = ev.target.value
            })
          }}/></div>
          <div>改年龄：<input type="number" value={state.age} onInput={(ev) => {
            update(draft => {
              draft.age = ev.target.value
            })
          }}/></div>
        </div>
      </div>
    )
  }
}

createApp(document.getElementById('app')!, <App/>)
