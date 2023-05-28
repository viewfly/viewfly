import { useSignal, JSXElement, inject, provide } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { Injectable } from '@tanbo/di'

import './index.scss'
import { Subject } from '@tanbo/stream'

@Injectable()
class Show {
  number = Math.random()

  onChange = new Subject<void>()

  change() {
    this.number = Math.random()
    this.onChange.next()
  }
}


function Tool() {
  const show = inject(Show)

  const toolName = useSignal('tollName')
  const showName = useSignal(show.number)
  show.onChange.subscribe(() => {
    showName.set(show.number)
  })
  return function () {
    console.log('=========')
    return (
      <div class="tool">
        <div>tool: {toolName()}</div>
        <div>{showName()}</div>
        <button type="button" onclick={() => {
          toolName.set('toolName' + Math.random())
          show.change()
        }
        }>updateToolName
        </button>
      </div>
    )
  }
}

function Toolbar() {
  console.log('Toolbar')

  const show = inject(Show)
  const showName = useSignal(show.number)
  show.onChange.subscribe(() => {
    showName.set(show.number)
  })
  return () => {
    console.log('-----------')
    return (
      <div class="toolbar">
        <div>
          <>
            <div>{showName()}</div>
            <div>11111</div>
          </>
        </div>
        <Tool/>
        <div>2222</div>
        <div>3333</div>
      </div>
    )
  }
}

function App() {
  const background = useSignal('yellow')
  provide(Show)
  console.log('App')
  return (): JSXElement => {
    return (
      <div class="app" style={{
        background: background()
      }}>
        <button type="button" onClick={() => {
          background.set(background() === 'yellow' ? 'orange' : 'yellow')
        }}>更新背景
        </button>
        {
          background() === 'yellow' ? <div>yellow</div> : <p>orange</p>
        }
        <Toolbar/>
        <div>{background()}</div>
      </div>
    )
  }
}

createApp(<App/>, document.getElementById('app')!)
