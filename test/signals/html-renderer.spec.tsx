import { createSignal, jsx, ViewFlyNode } from '@viewfly/core'
import { createApp, HTMLRenderer, OutputTranslator, VDOMElement } from '@viewfly/platform-browser'

interface HTMLApp {
  getHTML(): string
  destroy(): void
  render(): void
}

function createHTMLApp(root: ViewFlyNode, autoUpdate = true) {
  const app = createApp(root, {
    autoUpdate,
    nativeRenderer: new HTMLRenderer()
  })

  const rootNode = new VDOMElement('body')
  const translator = new OutputTranslator()

  app.mount(rootNode)

  return {
    getHTML() {
      return translator.transform(rootNode)
    },
    destroy() {
      app.destroy()
    },
    render() {
      app.render()
    }
  }
}

describe('单组件渲染', () => {
  let app: HTMLApp

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('单标签和双标签', () => {
    function App() {
      return () => {
        return (
          <div>
            <img src="/test.jpg" alt=""/>
            test
          </div>
        )
      }
    }

    app = createHTMLApp(<App/>)

    expect(app.getHTML()).toBe('<div><img src="/test.jpg" alt="">test</div>')
  })

  test('动态增删节点', () => {
    const data = createSignal([1])

    function App() {
      return () => {
        return <>
          {
            data().map(i => {
              return <div>{i}</div>
            })
          }
        </>
      }
    }

    app = createHTMLApp(<App/>, false)

    expect(app.getHTML()).toBe('<div>1</div>')
    data.set([1, 2])
    app.render()
    expect(app.getHTML()).toBe('<div>1</div><div>2</div>')
    data.set([3])
    app.render()
    expect(app.getHTML()).toBe('<div>3</div>')
  })

  test('动态增删属性', () => {
    const is = createSignal(true)

    function App() {
      return () => {
        return <div>
          {
            is() ? <p data-type="show" style={{
              color: 'red',
              background: 'green'
            }} class="test box">test</p> : <p style={{
              color: 'red',
            }} class="box">test</p>
          }
        </div>
      }
    }

    app = createHTMLApp(<App/>, false)
    expect(app.getHTML()).toBe('<div><p data-type="show" style="color:red;background:green" class="test box">test</p></div>')
    is.set(false)
    app.render()
    expect(app.getHTML()).toBe('<div><p style="color:red" class="box">test</p></div>')
  })

  test('转义特殊字符', () => {
    function App() {
      return () => {
        return <div data-value="aaa\aaa">
          {
            ['test   te<st', jsx('div', { 'test>': 't"e\st' } as any)]
          }
        </div>
      }
    }

    app = createHTMLApp(<App/>, false)
    expect(app.getHTML()).toBe('<div data-value="aaa\\aaa">test &nbsp;&nbsp;te&lt;st<div test&gt;="t&quot;est"></div></div>')
  })

  test('布尔属性', () => {
    function App() {
      return () => {
        return <button disabled>test</button>
      }
    }

    app = createHTMLApp(<App/>, false)
    expect(app.getHTML()).toBe('<button disabled>test</button>')
  })
})

