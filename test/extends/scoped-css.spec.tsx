import { Viewfly } from '@viewfly/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { createApp} from '@viewfly/platform-browser'

describe('ScopedCSS', () => {
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

  test('可正常替换 css 类名', () => {
    function App() {
      return withScopedCSS('app-test', () => {
        return (
          <div class="app">
            <div></div>
            <div></div>
          </div>
        )
      })
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" app-test=""><div app-test=""></div><div app-test=""></div></div>')
  })

  test('未提供替换值不产生作用', () => {
    function App() {
      return withScopedCSS('', () => {
        return (
          <div class="app">
            <div></div>
          </div>
        )
      })
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app"><div></div></div>')
  })


  test('支持多个配置', () => {
    function App() {
      return withScopedCSS(['data-a', 'data-b'], () => {
        return (
          <div class="app">
            <div></div>
          </div>
        )
      })
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" data-a="" data-b=""><div data-a="" data-b=""></div></div>')
  })
})
