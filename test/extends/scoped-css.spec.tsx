import { Application } from '@viewfly/core'
import { withScopedCSS } from '@viewfly/scoped-css'
import { createApp } from '@viewfly/platform-browser'

describe('ScopedCSS', () => {
  let root: HTMLElement
  let app: Application

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

  test('支持子组件内的虚拟 DOM 节点', () => {
    function Child(props: any) {
      return withScopedCSS('test', () => {
        return (
          <main>
            <p class="aaa">ccc</p>
            {props.children}
          </main>
        )
      })
    }

    function App() {
      return withScopedCSS('app-test', () => {
        return (
          <div class="app">
            <div>aaa</div>
            <div>bbb</div>
            <Child>
              <header>test header</header>
            </Child>
          </div>
        )
      })
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" app-test=""><div app-test="">aaa</div><div app-test="">bbb</div><main test=""><p class="aaa" test="">ccc</p><header app-test="">test header</header></main></div>')
  })

  test('支持属性中的虚拟 DOM 节点', () => {
    function Child(props: any) {
      return withScopedCSS('test', () => {
        return (
          <main>
            <p class="aaa">ccc</p>
            {props.header}
          </main>
        )
      })
    }

    function App() {
      return withScopedCSS('app-test', () => {
        return (
          <div class="app">
            <div>aaa</div>
            <div>bbb</div>
            <Child header={<header>test header</header>}/>
          </div>
        )
      })
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" app-test=""><div app-test="">aaa</div><div app-test="">bbb</div><main test=""><p class="aaa" test="">ccc</p><header app-test="">test header</header></main></div>')
  })

  test('支持子组件元素继承', () => {
    function Child(props) {
      return () => <p {...props}><span>test</span></p>
    }

    function App() {
      return withScopedCSS('scoped-css', () => {
        return (
          <div>
            <Child/>
          </div>
        )
      })
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div scoped-css=""><p scoped-css=""><span>test</span></p></div>')
  })
})
