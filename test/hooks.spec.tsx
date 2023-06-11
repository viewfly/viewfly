import { onDestroy, onMount, onPropsChanged, onUpdated, Renderer, useRef, useSignal, Viewfly } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

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

describe('Hooks: onMount', () => {
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
  test('组件挂载后执行回调', () => {
    const fn = jest.fn()

    function App() {
      onMount(fn)
      return () => {
        return <div></div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toBeCalled()
  })

  test('组件更新后不调用回调', () => {
    const fn = jest.fn()

    function App() {
      onMount(fn)
      const count = useSignal(0)
      return () => {
        return <div onClick={() => {
          count.set(count() + 1)
        }
        }>{count()}</div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenNthCalledWith(1)
    root.querySelector('div')!.click()
    expect(fn).toHaveBeenNthCalledWith(1)
  })

  test('组件销毁后调用回调', () => {
    const fn = jest.fn()

    function Child() {
      onMount(() => {
        return fn
      })
      return () => {
        return <div></div>
      }
    }

    function App() {
      const bool = useSignal(true)
      return () => {
        return <div onClick={() => {
          bool.set(false)
        }
        }>
          {bool() && <Child/>}
        </div>
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(1)
  })
})

describe('Hooks: onUpdated', () => {
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

  test('组件更新后触发回调', () => {
    const fn = jest.fn()

    function App() {
      const count = useSignal(0)
      onUpdated(fn)
      return () => {
        return <div onClick={() => {
          count.set(count() + 1)
        }
        }>{count()}</div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenNthCalledWith(1)
    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(2)

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(3)
  })

  test('子组件更新后触发回调，父组件不触发', () => {
    const fn = jest.fn()
    const fn1 = jest.fn()

    function Child() {
      const count = useSignal(0)
      onUpdated(fn1)
      return () => {
        return <p onClick={() => {
          count.set(count() + 1)
        }
        }>{count()}</p>
      }
    }

    function App() {
      onUpdated(fn)
      return () => {
        return (
          <div>
            <Child/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn1).toHaveBeenNthCalledWith(1)
    root.querySelector('p')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn1).toHaveBeenNthCalledWith(2)

    root.querySelector('p')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn1).toHaveBeenNthCalledWith(3)
  })

  test('组件更新后调用销毁函数', () => {
    const fn = jest.fn()

    function Child() {
      const count = useSignal(0)
      onUpdated(() => {
        return fn
      })
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
            <Child/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).not.toBeCalled()

    root.querySelector('p')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(1)

    root.querySelector('p')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(2)
  })
})

describe('Hooks: onPropsChanged', () => {
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

  test('属性变更正常触发回调', () => {
    const fn = jest.fn()

    function Child(props) {
      onPropsChanged(fn)
      return () => {
        return (
          <p>{props.count}</p>
        )
      }
    }

    function App() {
      const count = useSignal(0)

      return () => {
        return (
          <div onClick={() => {
            count.set(count() + 1)
          }
          }>
            <Child count={count()}/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).not.toBeCalled()

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toBeCalled()
  })
  test('属性变更可获取前后数据', () => {
    let currentProps!: any
    let oldProps!: any
    function Child(props) {
      onPropsChanged((a, b) => {
        currentProps = a
        oldProps = b
      })
      return () => {
        return (
          <p>{props.count}</p>
        )
      }
    }

    function App() {
      const count = useSignal(0)

      return () => {
        return (
          <div onClick={() => {
            count.set(count() + 1)
          }
          }>
            <Child count={count()}/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(currentProps!.count).toBe(1)
    expect(oldProps!.count).toBe(0)
  })


  test('属性变更调用上一次销毁回调函数', () => {
    const fn = jest.fn()
    function Child(props) {
      onPropsChanged(() => {
        return fn
      })
      return () => {
        return (
          <p>{props.count}</p>
        )
      }
    }

    function App() {
      const count = useSignal(0)

      return () => {
        return (
          <div onClick={() => {
            count.set(count() + 1)
          }
          }>
            <Child count={count()}/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).not.toBeCalled()

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(fn).toHaveBeenNthCalledWith(1)
  })
})

describe('Hooks: onDestroy', () => {
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

  test('组件销毁时调用回调函数', () => {
    const fn = jest.fn()

    function Child() {
      onDestroy(fn)
      return () => {
        return <div></div>
      }
    }

    function App() {
      const bool = useSignal(true)
      return () => {
        return <div onClick={() => {
          bool.set(false)
        }
        }>
          {bool() && <Child/>}
        </div>
      }
    }
    app = createApp(root, <App/>, false)
    expect(fn).not.toBeCalled()
    root.querySelector('div')!.click()
    app.get(Renderer).refresh()

    expect(fn).toHaveBeenNthCalledWith(1)
  })
})
