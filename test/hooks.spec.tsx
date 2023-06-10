import { Renderer, useRef, useSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

describe('Hooks', () => {
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
  test('不能在组件外调用 hook', () => {
    expect(() => {
      useSignal('')
    }).toThrow()
  })

  test('可以在 mount 生命周期中拿到元素', () => {
    let div: any

    function App() {
      const ref = useRef(node => {
        div = node
      })
      return () => {
        return (
          <div ref={ref}>test</div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(div).not.toBeUndefined()
  })
  test('可以在 mount 生命周期中拿到多个绑定 ref 的元素', () => {
    const nodes: any[] = []

    function App() {
      const ref = useRef(node => {
        nodes.push(node)
      })
      return () => {
        return (
          <div>
            <div ref={ref}>test</div>
            <p ref={ref}>test</p>
            <nav ref={ref}>test</nav>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(nodes.length).toBe(3)
    expect(nodes[0].tagName).toBe('DIV')
    expect(nodes[1].tagName).toBe('P')
    expect(nodes[2].tagName).toBe('NAV')
  })

  test('数据变更不会重新执行回调', () => {
    let i = 0

    function App() {
      const ref = useRef(() => {
        i++
      })
      const css = useSignal('box')

      return () => {
        return (
          <div class={css()} ref={ref} onClick={() => {
            css.set('container')
          }}>test</div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(i).toBe(1)
  })
  test('绑定多个元素数据变更不会重新执行回调', () => {
    let i = 0

    function App() {
      const ref = useRef(() => {
        i++
      })
      const css = useSignal('box')

      return () => {
        return (
          <div>
            <div class={css()} ref={ref}>test</div>
            <p class={css()} ref={ref}>test</p>
            <button onClick={() => {
              css.set('container')
            }}></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('button')!.click()
    app.get(Renderer).refresh()
    expect(i).toBe(2)
  })

  test('引用消失时，执行销毁函数', () => {
    const fn = jest.fn()
    let i = 0

    function App() {
      const ref = useRef(() => {
        i++
        return fn
      })

      const isShow = useSignal(true)

      return () => {
        return (
          <div>
            {
              isShow() && <div ref={ref}>test</div>
            }
            <button onClick={() => {
              isShow.set(false)
            }}></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('button')!.click()
    app.get(Renderer).refresh()
    expect(i).toBe(1)
    expect(fn).toBeCalled()
  })

  test('切换 ref 时，原 ref 会执行销毁回调', () => {
    const fn = jest.fn()
    let i = 0

    function App() {
      const ref = useRef(() => {
        i++
        return fn
      })
      const ref2 = useRef(() => {
      })
      const bool = useSignal(true)

      return () => {
        return (
          <div>
            <div ref={bool() ? ref : ref2}>test</div>
            <button onClick={() => {
              bool.set(false)
            }}></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('button')!.click()
    app.get(Renderer).refresh()
    expect(i).toBe(1)
    expect(fn).toBeCalled()
  })
})
