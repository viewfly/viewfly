import { onUpdated, Renderer, useEffect, useRef, useSignal, Viewfly } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import * as path from 'path';

describe('Hooks: useRef', () => {
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
        //
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

describe('Hooks: Signal', () => {
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
  test('相同值不会触发渲染', () => {
    const fn = jest.fn()

    function App() {
      const count = useSignal(1)

      function update() {
        count.set(count())
      }

      return function () {
        fn()
        return (<div onClick={update}>App{count()}</div>)
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div>App1</div>')

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('可以在组件外调用，并更新组件', () => {
    const count = useSignal(1)

    function App() {
      return () => {
        return (
          <div>{count()}</div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div>1</div>')

    count.set(2)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>2</div>')
  })

  test('多组件共享一个状态', () => {
    const count = useSignal(0)

    function Child() {
      return () => {
        return <p onClick={() => {
          count.set(count() + 1)
        }
        }>{count()}</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <div>{count()}</div>
            <Child/>
          </div>
        )
      }
    }
    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div><div>0</div><p>0</p></div>')

    const p = root.querySelector('p')!
    p.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><div>1</div><p>1</p></div>')
  })
})

describe('Hooks: Effect', () => {
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

  test('可以监听到状态的变化', () => {
    const count = useSignal(1)
    const fn = jest.fn()
    useEffect(count, () => {
      fn()
    })
    count.set(2)

    expect(fn).toHaveBeenCalledTimes(1)
  })
  test('可以监听一组状态的变化', () => {
    const count = useSignal(1)
    const count2 = useSignal(1)
    const fn = jest.fn()
    useEffect([count, count2], () => {
      fn()
    })
    count.set(2)
    expect(fn).toHaveBeenCalledTimes(1)
    count2.set(2)
    expect(fn).toHaveBeenCalledTimes(2)
  })
  test('状态多次变化，可以正常执行销毁函数', () => {
    const count = useSignal(1)
    const fn = jest.fn()
    const fn1 = jest.fn()
    useEffect(count, () => {
      fn()
      return fn1
    })
    count.set(2)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn1).not.toBeCalled()
    count.set(3)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn1).toHaveBeenCalledTimes(1)
  })
  test('取消监听，不再调用回调函数', () => {
    const count = useSignal(1)
    const fn = jest.fn()
    const fn1 = jest.fn()
    const unListen = useEffect(count, () => {
      fn()
      return fn1
    })
    count.set(2)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn1).not.toBeCalled()
    count.set(3)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn1).toHaveBeenCalledTimes(1)
    unListen()
    count.set(4)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn1).toHaveBeenCalledTimes(1)
  })

  test('多次调用销毁无副作用', () => {
    const count = useSignal(1)
    const fn = jest.fn()
    const fn1 = jest.fn()
    const unListen = useEffect(count, () => {
      fn()
      return fn1
    })
    count.set(2)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn1).not.toBeCalled()
    count.set(3)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn1).toHaveBeenCalledTimes(1)
    unListen()
    unListen()
    count.set(4)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn1).toHaveBeenCalledTimes(1)
  })

  test('组件销毁后不再监听', () => {
    const count = useSignal(0)

    const fn = jest.fn()

    function Child() {
      useEffect(count, () => {
        fn()
      })
      return () => {
        return (
          <p></p>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div onClick={() => {
            count.set(count() + 1)
          }}>
            {count() > 1 ? null : <Child/>}
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenCalledTimes(0)

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenCalledTimes(1)

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenCalledTimes(2)

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

