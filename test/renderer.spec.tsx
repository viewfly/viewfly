import { createApp } from '@viewfly/platform-browser'
import { Renderer, useSignal } from '@viewfly/core'

describe('单组件渲染', () => {
  let root: HTMLElement
  let app: any

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('正常生成 DOM 结构', () => {
    function App() {
      return function () {
        return (<div>App</div>)
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('<div>App</div>')
  })

  test('支持返回 null', () => {
    function App() {
      return () => null
    }

    app = createApp(root, <App/>)
    expect(root.innerHTML).toBe('')
  })

  test('支持返回 Fragment', () => {
    function App() {
      return () => {
        return (
          <>
            text!
          </>
        )
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('text!')
  })

  test('支持在模板中嵌套 Fragment', () => {
    function App() {
      return function () {
        return (
          <div>
            <div>App</div>
            <>
              <p>hello</p>
              <p>viewfly</p>
            </>
          </div>
        )
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('<div><div>App</div><p>hello</p><p>viewfly</p></div>')
  })
})

describe('事件绑定', () => {
  let root: HTMLElement
  let app: any

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('可以绑定事件', () => {
    const eventCallback = jest.fn()

    function App() {
      return function () {
        return (<div onClick={eventCallback}>App</div>)
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('div')!.click()

    expect(eventCallback).toBeCalled()
  })


  test('重新渲染后，事件不会重复绑定', () => {
    let i = 0

    function App() {
      const count = useSignal(0)

      function update() {
        i++
        count.set(count() + 1)
      }

      return function () {
        return (
          <div>
            <p>{count()}</p>
            <button onClick={update}>btn</button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const btn = root.querySelector('button')!
    btn.click()
    btn.click()
    app.get(Renderer).refresh()
    expect(root.querySelector('p')!.innerHTML).toBe('2')
    expect(i).toBe(2)
  })
})

describe('属性传递', () => {
  let root: HTMLElement
  let app: any

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('可以通过 props 获取上层组件的数据', () => {
    function Button(props) {
      return function () {
        return (
          <button type={props.type}></button>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Button type="button"/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.querySelector('button')!.type).toBe('button')
  })

  test('可以接收到 props 变更', () => {
    function Input(props) {
      return function () {
        return (
          <input type={props.type}/>
        )
      }
    }

    function App() {
      const type = useSignal('text')
      return function () {
        return (
          <div>
            <Input type={type()}/>
            <button onClick={() => {
              type.set('number')
            }}></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    const input = root.querySelector('input')!
    const btn = root.querySelector('button')!

    expect(input.type).toBe('text')

    btn.click()
    app.get(Renderer).refresh()
    expect(input.type).toBe('number')
  })

  test('修改 props 会引发错误', () => {
    function Input(props) {
      props.type = 'number'
      return function () {
        return (
          <input type={props.type}/>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Input type='text'/>
          </div>
        )
      }
    }

    expect(() => createApp(root, <App/>, false)).toThrow()
  })
})
