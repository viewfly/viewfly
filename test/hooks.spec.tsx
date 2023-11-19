import { Signal, createDerived, watch, createRef, createDynamicRef, createSignal, Application, onMounted } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

describe('Hooks: useDynamicRef', () => {
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

  test('意外值不生效', () => {
    const fn = jest.fn()
    const ref = createDynamicRef(() => {
      fn()
    })
    ref.bind(0 as any)

    expect(fn).not.toBeCalled()
  })

  test('可以在元素渲染完成时拿到元素', () => {
    let div: any

    function App() {
      const ref = createDynamicRef<HTMLDivElement>(node => {
        div = node
      })
      return () => {
        return (
          <div ref={ref}>test</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(div).not.toBeUndefined()
  })
  test('可以在绑定多个元素', () => {
    const nodes: any[] = []

    function App() {
      const ref = createDynamicRef<any>(node => {
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

    app = createApp(<App/>, false).mount(root)
    expect(nodes.length).toBe(3)
    expect(nodes[0].tagName).toBe('DIV')
    expect(nodes[1].tagName).toBe('P')
    expect(nodes[2].tagName).toBe('NAV')
  })

  test('可以在绑定多个 ref', () => {
    const fn1 = jest.fn()
    const fn2 = jest.fn()
    const nodes: any[] = []

    function App() {
      const ref1 = createDynamicRef<HTMLDivElement>((node) => {
        nodes.push(node)
        fn1()
      })
      const ref2 = createDynamicRef<HTMLDivElement>(node => {
        nodes.push(node)
        fn2()
      })
      return () => {
        return (
          <div>
            <div ref={[ref1, ref2]}>test</div>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(nodes.length).toBe(2)
    expect(nodes[0]).toEqual(nodes[1])

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  test('多次绑定只会生效一次', () => {
    const fn1 = jest.fn()
    const nodes: any[] = []

    function App() {
      const ref1 = createDynamicRef<HTMLDivElement>((node) => {
        nodes.push(node)
        fn1()
      })
      return () => {
        return (
          <div>
            <div ref={[ref1, ref1]}>test</div>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(nodes.length).toBe(1)

    expect(fn1).toHaveBeenCalledTimes(1)
  })

  test('数据变更不会重新执行回调', () => {
    let i = 0

    function App() {
      const ref = createDynamicRef<HTMLDivElement>(() => {
        i++
      })
      const css = createSignal('box')

      return () => {
        return (
          <div class={css()} ref={ref} onClick={() => {
            css.set('container')
          }}>test</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    root.querySelector('div')!.click()
    app.render()
    expect(i).toBe(1)
  })
  test('绑定多个元素数据变更不会重新执行回调', () => {
    let i = 0

    function App() {
      const ref = createDynamicRef<HTMLDivElement | HTMLParagraphElement>(() => {
        i++
      })
      const css = createSignal('box')

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

    app = createApp(<App/>, false).mount(root)
    root.querySelector('button')!.click()
    app.render()
    expect(i).toBe(2)
  })

  test('引用消失时，执行销毁函数', () => {
    const fn = jest.fn()
    let i = 0

    function App() {
      const ref = createDynamicRef<HTMLDivElement>(() => {
        i++
        return fn
      })

      const isShow = createSignal(true)

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

    app = createApp(<App/>, false).mount(root)
    root.querySelector('button')!.click()
    app.render()
    expect(i).toBe(1)
    expect(fn).toBeCalled()
  })

  test('切换 ref 时，原 ref 会执行销毁回调', () => {
    const fn = jest.fn()
    let i = 0

    function App() {
      const ref = createDynamicRef<HTMLDivElement>(() => {
        i++
        return fn
      })
      const ref2 = createDynamicRef<HTMLDivElement>(() => {
        //
      })
      const bool = createSignal(true)

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

    app = createApp(<App/>, false).mount(root)
    root.querySelector('button')!.click()
    app.render()
    expect(i).toBe(1)
    expect(fn).toBeCalled()
  })
})

describe('Hooks: useSignal', () => {
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

  test('可以正常更新状态', () => {
    function App() {
      const count = createSignal(1)

      function update() {
        count.set(count() + 1)
      }

      return function () {
        return (<div onClick={update}>App{count()}</div>)
      }
    }

    app = createApp(<App/>, false).mount(root)

    expect(root.innerHTML).toBe('<div>App1</div>')

    root.querySelector('div')!.click()
    app.render()

    expect(root.innerHTML).toBe('<div>App2</div>')
  })

  test('相同值不会触发渲染', () => {
    const fn = jest.fn()

    function App() {
      const count = createSignal(1)

      function update() {
        count.set(count())
      }

      return function () {
        fn()
        return (<div onClick={update}>App{count()}</div>)
      }
    }

    app = createApp(<App/>, false).mount(root)

    expect(root.innerHTML).toBe('<div>App1</div>')

    root.querySelector('div')!.click()
    app.render()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('可以在组件外调用，并更新组件', () => {
    const count = createSignal(1)

    function App() {
      return () => {
        return (
          <div>{count()}</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)

    expect(root.innerHTML).toBe('<div>1</div>')

    count.set(2)
    app.render()
    expect(root.innerHTML).toBe('<div>2</div>')
  })

  test('多组件共享一个状态', () => {
    const count = createSignal(0)

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

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><div>0</div><p>0</p></div>')

    const p = root.querySelector('p')!
    p.click()
    app.render()
    expect(root.innerHTML).toBe('<div><div>1</div><p>1</p></div>')
  })
})

describe('Hooks: useEffect', () => {
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

  test('可以监听到状态的变化', () => {
    const count = createSignal(1)
    const fn = jest.fn()
    watch(count, (a, b) => {
      fn(a, b)
    })
    count.set(2)

    expect(fn).toHaveBeenNthCalledWith(1, 2, 1)
  })
  test('可以监听一组状态的变化', () => {
    const count = createSignal(1)
    const count2 = createSignal(1)
    const fn = jest.fn()
    watch([count, count2], (a, b) => {
      fn(a, b)
    })
    count.set(2)
    expect(fn).toHaveBeenNthCalledWith(1, [2, 1], [1, 1])
    count2.set(2)
    expect(fn).toHaveBeenNthCalledWith(2, [2, 2], [2, 1])
  })
  test('可根据函数自动收集依赖', () => {
    const count = createSignal(1)
    const fn = jest.fn()
    watch(() => {
      return count()
    }, (a, b) => {
      fn(a, b)
    })
    count.set(2)
    expect(fn).toHaveBeenNthCalledWith(1, 2, 1)
    count.set(3)
    expect(fn).toHaveBeenNthCalledWith(2, 3, 2)
  })
  test('状态多次变化，可以正常执行销毁函数', () => {
    const count = createSignal(1)
    const fn = jest.fn()
    const fn1 = jest.fn()
    watch(count, () => {
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
    const count = createSignal(1)
    const fn = jest.fn()
    const fn1 = jest.fn()
    const unListen = watch(count, () => {
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
    const count = createSignal(1)
    const fn = jest.fn()
    const fn1 = jest.fn()
    const unListen = watch(count, () => {
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
    const count = createSignal(0)

    const fn = jest.fn()

    function Child() {
      watch(count, () => {
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

    app = createApp(<App/>, false).mount(root)
    expect(fn).toHaveBeenCalledTimes(0)

    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(1)

    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(2)

    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(2)
  })
})

describe('Hooks: useDerived', () => {
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

  test('可以同步求值', () => {
    const count = createSignal(1)
    const count2 = createSignal(2)

    const count3 = createDerived(() => {
      return count() + count2()
    })
    expect(count3()).toBe(3)

    count2.set(3)
    expect(count3()).toBe(4)
  })

  test('在组件销毁后，不再更新值', () => {
    const count = createSignal(1)
    const count2 = createSignal(2)

    let count3: Signal<number>

    function App() {
      count3 = createDerived(() => {
        return count() + count2()
      })
      return () => {
        return (
          <div>{count3()}</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div>3</div>')
    expect(count3!()).toBe(3)

    app.destroy()
    count.set(2)

    expect(count3!()).toBe(3)
  })

  test('取消同步后，不再更新值', () => {
    const sA = createSignal(1)
    const sB = createSignal(2)

    const sC = createDerived(() => {
      return sA() + sB()
    }, (v) => {
      return v < 5
    })

    expect(sC()).toBe(3)
    sA.set(2)
    expect(sC()).toBe(4)
    sB.set(3)
    expect(sC()).toBe(5)
    sA.set(3)
    expect(sC()).toBe(5)
    sB.set(4)
    expect(sC()).toBe(5)
  })

  test('根据不同状态，监听不同值', () => {
    const bool = createSignal(true)

    const sA = createSignal(1)
    const sB = createSignal('a')

    const fn = jest.fn()

    const sC = createDerived(() => {
      fn()
      if (bool()) {
        return sA()
      }
      return sB()
    })

    expect(sC()).toBe(1)
    sA.set(2)
    expect(sC()).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)

    bool.set(false)
    expect(sC()).toBe('a')
    expect(fn).toHaveBeenCalledTimes(3)

    sA.set(3)
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sC()).toBe('a')

    bool.set(true)
    expect(sC()).toBe(3)
  })

  test('可防止死循环', () => {
    let b = false
    const count = createSignal(0)

    const result = createDerived(() => {
      if (b) {
        count.set(count() + 1)
      }
      b = true
      return count()
    })

    expect(result()).toBe(0)
    count.set(1)
    expect(result()).toBe(2)
  })
})

describe('Hooks: useRef', () => {
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

  test('默认值为 null', () => {
    function App() {
      const ref = createRef<HTMLDivElement>()
      expect(ref.current).toBeNull()
      return () => (
        <div ref={ref}></div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })

  test('视图渲染后可获取到 DOM', () => {
    function App() {
      const ref = createRef<HTMLDivElement>()
      onMounted(() => {
        expect(ref.current?.tagName).toBe('DIV')
      })
      return () => (
        <div ref={ref}></div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })

  test('绑定多个，只生效第一个', () => {
    function App() {
      const ref = createRef<HTMLDivElement>()
      onMounted(() => {
        expect(ref.current?.tagName).toBe('P')
      })
      return () => (
        <div>
          <p ref={ref}></p>
          <div ref={ref}></div>
        </div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })

  test('可获取组件实例', () => {
    let isCalled = false

    function Child() {
      return {
        show() {
          isCalled = true
        },
        $render() {
          return (
            <div>xxx</div>
          )
        }
      }
    }

    function App() {
      const ref = createRef<typeof Child>()
      onMounted(() => {
        ref.current?.show()
        expect(isCalled).toBeTruthy()
      })
      return () => (
        <div>
          <Child ref={ref}/>
        </div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })
})
