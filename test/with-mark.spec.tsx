import { Application, withMark } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

describe('withMark', () => {
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
    const App = withMark('app-test', function App() {
      return () => {
        return (
          <div class="app">
            <div></div>
            <div></div>
          </div>
        )
      }
    })

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" app-test=""><div app-test=""></div><div app-test=""></div></div>')
  })

  test('未提供替换值不产生作用', () => {
    const App = withMark('', function App() {
      return () => {
        return (
          <div class="app">
            <div></div>
          </div>
        )
      }
    })

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app"><div></div></div>')
  })


  test('支持多个配置', () => {
    const App = withMark(['data-a', 'data-b'], function App() {
      return () => {
        return (
          <div class="app">
            <div></div>
          </div>
        )
      }
    })

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" data-a="" data-b=""><div data-a="" data-b=""></div></div>')
  })

  test('支持子组件内的虚拟 DOM 节点', () => {
    const Child = withMark('test', function Child(props: any) {
      return () => {
        return (
          <main>
            <p class="aaa">ccc</p>
            {props.children}
          </main>
        )
      }
    })

    const App = withMark('app-test', function App() {
        return () => {
          return (
            <div class="app">
              <div>aaa</div>
              <div>bbb</div>
              <Child>
                <header>test header</header>
              </Child>
            </div>
          )
        }
      }
    )
    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" app-test=""><div app-test="">aaa</div><div app-test="">bbb</div><main test=""><p class="aaa" test="">ccc</p><header app-test="">test header</header></main></div>')
  })

  test('支持属性中的虚拟 DOM 节点', () => {
    const Child = withMark('test', function Child(props: any) {
      return () => {
        return (
          <main>
            <p class="aaa">ccc</p>
            {props.header}
          </main>
        )
      }
    })

    const App = withMark('app-test', function App() {
      return () => {
        return (
          <div class="app">
            <div>aaa</div>
            <div>bbb</div>
            <Child header={<header>test header</header>}/>
          </div>
        )
      }
    })

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div class="app" app-test=""><div app-test="">aaa</div><div app-test="">bbb</div><main test=""><p class="aaa" test="">ccc</p><header app-test="">test header</header></main></div>')
  })

  test('支持子组件元素继承', () => {
    function Child(props: any) {
      return () => <p {...props}><span>test</span></p>
    }

    const App = withMark('scoped-css', function App() {
      return () => {
        return (
          <div>
            <Child/>
          </div>
        )
      }
    })

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div scoped-css=""><p scoped-css=""><span>test</span></p></div>')
  })
})
