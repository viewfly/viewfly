import { createApp } from '@viewfly/platform-browser'

import './index.css'
import { createSignal } from '@viewfly/core'
import { Input } from './input'

function App() {

  const setLink = (e: Event) => {
    console.log(e)
  }

  const value = createSignal('')
  return () => {
    return <div>
      <form onSubmit={setLink} class={'p-1'}>
        <Input block={true} size={'small'} placeholder={'请输入链接地址'} onChange={v => {
          value.set(v)
        }} suffix={<button type={'submit'}>确定</button>}/>
      </form>
    </div>
  }
}

createApp(<App/>).mount(document.querySelector('#main')!)
