import { Viewfly } from '@viewfly/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { createApp } from '@viewfly/platform-browser'

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
      return withScopedCSS({
        app: 'app-test',
        child: 'child-test'
      }, () => {
        return (
          <div class="app" css="app">
            <div css="child"></div>
            <div css="child"></div>
          </div>
        )
      })
    }

    createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class="app app-test"><div class="child-test"></div><div class="child-test"></div></div>')
  })

  test('未提供替换值不产生作用', () => {
    function App() {
      return withScopedCSS({}, () => {
        return (
          <div class="app" css="app">
            <div css="child"></div>
          </div>
        )
      })
    }

    createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class="app"><div></div></div>')
  })

  test('空值不会产生任何作用', () => {
    function App() {
      return withScopedCSS({
        app: 'app-test'
      }, () => {
        return (
          <div class="app" css="">
            <div css="child"></div>
          </div>
        )
      })
    }

    createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class="app"><div></div></div>')
  })

  test('空白字符串不会产生任何作用', () => {
    function App() {
      return withScopedCSS({
        app: 'app-test'
      }, () => {
        return (
          <div class="app" css=" ">
            <div css="child"></div>
          </div>
        )
      })
    }

    createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class="app"><div></div></div>')
  })

  test('支持复杂配置', () => {
    function App() {
      return withScopedCSS({
        app: 'app-test',
        root: 'root-test'
      }, () => {
        return (
          <div class="app" css={['app', { root: true }]}>
            <div css="child"></div>
          </div>
        )
      })
    }

    createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class="app app-test root-test"><div></div></div>')
  })

  test('支持字符串', () => {
    function App() {
      return withScopedCSS({
        app: 'app-test',
        root: 'root-test'
      }, () => {
        return (
          <div class="app" css="app root">
            <div css="child"></div>
          </div>
        )
      })
    }

    createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class="app app-test root-test"><div></div></div>')
  })

  test('支持非常规数据解析', () => {
    const obj = {
      toString() {
        return 'box'
      }
    }

    function App() {
      return withScopedCSS({ box: 'box-test' }, function () {
        return (
          <div css={obj}></div>
        )
      })
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div class="box-test"></div>')
  })
})
