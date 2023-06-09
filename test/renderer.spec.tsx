import { createApp } from '@viewfly/platform-browser'

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

    app = createApp(root, () => <App/>)

    expect(root.innerHTML).toBe('<div>App</div>')
  })

  test('支持返回 null', () => {
    function App() {
      return () => null
    }

    app = createApp(root, () => <App/>)
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

    app = createApp(root, () => <App/>)

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

    app = createApp(root, () => <App/>)

    expect(root.innerHTML).toBe('<div><div>App</div><p>hello</p><p>viewfly</p></div>')
  })
})
