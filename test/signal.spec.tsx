import { createApp } from '@viewfly/platform-browser'
import { Renderer, useSignal, Viewfly } from '@viewfly/core'

describe('状态管理', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('可以正常更新状态', () => {
    function App() {
      const count = useSignal(1)
      function update() {
        count.set(count() + 1)
      }
      return function () {
        return (<div onClick={update}>App{count()}</div>)
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div>App1</div>')

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()

    expect(root.innerHTML).toBe('<div>App2</div>')
  })

  test('可以通过函数更新状态', () => {
    function App() {
      const count = useSignal(1)
      function update() {
        count.set(oldValue => {
          return oldValue + 1
        })
      }
      return function () {
        return (<div onClick={update}>App{count()}</div>)
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div>App1</div>')

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()

    expect(root.innerHTML).toBe('<div>App2</div>')
  })
})
