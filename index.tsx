import { useSignal, JSXElement, inject, provide, onPropsChanged, ComponentFactory } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { Injectable } from '@tanbo/di'

import './index.scss'
import { Subject } from '@tanbo/stream'

import css from './index.module.scss'
import { scopedCss } from '@viewfly/scoped-css';

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
  console.log('tool')
  return function () {
    console.log('=========')
    return (
      <div class="tool" d={3}>
        <button type="button" onClick={() => {
          toolName.set('toolName' + Math.random())
          show.change()
        }
        }>{toolName()}
        </button>
      </div>
    )
  }
}

function Toolbar(props: any) {
  console.log('Toolbar')

  provide(Show)
  const show = inject(Show)
  const toolName = useSignal('tollName')
  const showName = useSignal(show.number)
  show.onChange.subscribe(() => {
    showName.set(show.number)
  })

  onPropsChanged((currentProps, oldProps) => {
    console.log(currentProps, oldProps)
  })
  return () => {
    console.log('-----------')
    return (
      <div class="toolbar">
        <div>父组件背景{props.background()}</div>
        <div class="toolbar1">{showName()}</div>
        <Tool/>
        <div class="toolbar2">999</div>
      </div>
    )
  }
}

function App() {
  const background = useSignal('yellow')
  provide(Show)
  console.log('App')
  const size = useSignal(1)
  return (): JSXElement => {
    return (
      <div d={1} class="app" css="app" style={{
        background: background()
      }}>
        <button css="btn" type="button" onClick={() => {
          size.set(size() + 1)
        }
        }>添加
        </button>
        {
          Array.from({ length: size() }).map((i, index) => {
            return (
              <div>
                <h3>{index}</h3>
                <button d={2} type="button" onClick={() => {
                  background.set(background() === 'yellow' ? 'orange' : 'yellow')
                }}>更新背景
                </button>
                <Toolbar background={background}/>
                {background() === 'yellow' ? <nav>1111</nav> : <p>2222</p>}
                <div d={2}>
                  <div>{background()}</div>
                </div>
              </div>
            )
          })
        }
        <div>
          last
        </div>
      </div>
    )
  }
}

const CSSApp = scopedCss(css, App)

function TestApp() {
  return () => null
}

const app = createApp(document.getElementById('app')!, () => <CSSApp/>)

document.getElementById('btn')!.addEventListener('click', () => {
  app.destroy()
})
