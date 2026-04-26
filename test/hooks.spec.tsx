import { watch, createRef, createDynamicRef, Application, onMounted, reactive, computed, Computed, createSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

describe('Hooks: createDynamicRef', () => {
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

  test('数据变更不会重新执行回调', () => {
    let i = 0

    function App() {
      const ref = createDynamicRef<HTMLDivElement>(() => {
        i++
      })
      const model = reactive({
        css: 'box'
      })

      return () => {
        return (
          <div class={model.css} ref={ref} onClick={() => {
            model.css = 'container'
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
      const model = reactive({
        css: 'box'
      })

      return () => {
        return (
          <div>
            <div class={model.css} ref={ref}>test</div>
            <p class={model.css} ref={ref}>test</p>
            <button onClick={() => {
              model.css = 'container'
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

      const model = reactive({
        isShow: true
      })

      return () => {
        return (
          <div>
            {
              model.isShow && <div ref={ref}>test</div>
            }
            <button onClick={() => {
              model.isShow = false
            }}></button>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    root.querySelector('button')!.click()
    app.render()
    expect(i).toBe(1)
    expect(fn).toHaveBeenCalled()
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
      const model = reactive({
        bool: true,
      })

      return () => {
        return (
          <div>
            <div ref={model.bool ? ref : ref2}>test</div>
            <button onClick={() => {
              model.bool = false
            }}></button>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    root.querySelector('button')!.click()
    app.render()
    expect(i).toBe(1)
    expect(fn).toHaveBeenCalled()
  })
})

describe('Hooks: reactive', () => {
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
      const model = reactive({
        count: 1
      })

      function update() {
        model.count++
      }

      return function () {
        return (<div onClick={update}>App{model.count}</div>)
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
      const model = reactive({
        count: 1
      })

      function update() {
        model.count = 1
      }

      return function () {
        fn()
        return (<div onClick={update}>App{model.count}</div>)
      }
    }

    app = createApp(<App/>, false).mount(root)

    expect(root.innerHTML).toBe('<div>App1</div>')

    root.querySelector('div')!.click()
    app.render()

    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('可以在组件外调用，并更新组件', () => {
    const model = reactive({
      count: 1
    })

    function App() {
      return () => {
        return (
          <div>{model.count}</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)

    expect(root.innerHTML).toBe('<div>1</div>')

    model.count = 2
    app.render()
    expect(root.innerHTML).toBe('<div>2</div>')
  })

  test('多组件共享一个状态', () => {
    const model = reactive({
      count: 0
    })

    function Child() {
      return () => {
        return <p onClick={() => {
          model.count++
        }
        }>{model.count}</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <div>{model.count}</div>
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

describe('Hooks: watch', () => {
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
    const model = reactive({
      count: 1
    })
    const fn = jest.fn()
    watch(() => {
      return model.count
    }, (a, b) => {
      fn(a, b)
    })
    model.count = 2

    expect(fn).toHaveBeenNthCalledWith(1, 2, 1)
  })
  test('可以监听一组状态的变化', () => {
    const model = reactive({
      count: 1,
      count2: 1
    })
    const fn = jest.fn()
    watch(() => {
      return [model.count, model.count2]
    }, (a, b) => {
      fn(a, b)
    })
    model.count = 2
    expect(fn).toHaveBeenNthCalledWith(1, [2, 1], [1, 1])
    model.count2 = 2
    expect(fn).toHaveBeenNthCalledWith(2, [2, 2], [2, 1])
  })
  test('可根据函数自动收集依赖', () => {
    const model = reactive({
      count: 1,
    })
    const fn = jest.fn()
    watch(() => {
      return model.count
    }, (a, b) => {
      fn(a, b)
    })
    model.count = 2
    expect(fn).toHaveBeenNthCalledWith(1, 2, 1)
    model.count = 3
    expect(fn).toHaveBeenNthCalledWith(2, 3, 2)
  })

  test('watch 对 NaN -> NaN 不重复触发', () => {
    const model = reactive({
      value: Number.NaN
    })
    const fn = jest.fn()
    watch(() => {
      return model.value
    }, (a, b) => {
      fn(a, b)
    })
    model.value = Number.NaN
    expect(fn).toHaveBeenCalledTimes(0)
  })

  test('组件销毁后不再监听', () => {
    const model = reactive({
      count: 0,
    })

    const fn = jest.fn()

    function Child() {
      watch(() => {
        return model.count
      }, () => {
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
            model.count++
          }}>
            {model.count > 1 ? null : <Child/>}
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

describe('Hooks: computed', () => {
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
    const model = reactive({
      count: 1,
      count2: 2
    })
    const count3 = computed(() => {
      return model.count + model.count2
    })

    expect(count3.value).toBe(3)

    model.count2 = 3
    expect(count3.value).toBe(4)
  })

  test('多次读取会复用缓存，依赖变化后才重新计算', () => {
    const model = reactive({
      count: 1
    })
    const fn = jest.fn(() => model.count + 1)
    const result = computed(fn)

    expect(result.value).toBe(2)
    expect(result.value).toBe(2)
    expect(fn).toHaveBeenCalledTimes(1)

    model.count = 2
    expect(fn).toHaveBeenCalledTimes(1)
    expect(result.value).toBe(3)
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('在组件销毁后，会解绑 computed 依赖', () => {
    const model = reactive({
      count: 1,
      count2: 2
    })

    let count3: Computed<number>

    function App() {
      count3 = computed(() => {
        return model.count + model.count2
      })
      return () => {
        return (
          <div>{count3.value}</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div>3</div>')
    expect(count3!.value).toBe(3)

    app.destroy()
    model.count = 2

    expect(count3!.value).toBe(3)
  })

  test('根据不同状态，监听不同值', () => {
    const model = reactive({
      bool: true,
      sA: 1,
      sB: 'a'
    })

    const fn = jest.fn()

    const sC = computed(() => {
      fn()
      if (model.bool) {
        return model.sA
      }
      return model.sB
    })

    expect(sC.value).toBe(1)
    model.sA = 2
    expect(sC.value).toBe(2)
    expect(fn).toHaveBeenCalledTimes(2)

    model.bool = false
    expect(sC.value).toBe('a')
    expect(fn).toHaveBeenCalledTimes(3)

    model.sA = 3
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sC.value).toBe('a')

    model.bool = true
    expect(sC.value).toBe(3)
  })

  test('可防止死循环', () => {
    let b = false
    const model = reactive({
      count: 0
    })

    const result = computed(() => {
      if (b) {
        model.count++
      }
      b = true
      return model.count
    })

    expect(result.value).toBe(0)
    model.count = 1
    expect(result.value).toBe(2)
  })
})

describe('Hooks: createRef', () => {
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
      const ref = createRef<HTMLDivElement | null>()
      expect(ref.value).toBeNull()
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
        expect(ref.value?.tagName).toBe('DIV')
      })
      return () => (
        <div ref={ref}></div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })

  test('绑定多个，只生效最后一个', () => {
    function App() {
      const ref = createRef<HTMLDivElement>()
      onMounted(() => {
        expect(ref.value?.tagName).toBe('DIV')
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


  test('条件绑定，值可以更新', () => {
    const is = createSignal(true)

    const ref = createRef<HTMLDivElement>()

    function App() {
      return () => (
        <div>
          {is() ? <p ref={ref}></p> : <div ref={ref}></div>}
        </div>
      )
    }

    app = createApp(<App/>, false).mount(root)
    expect(ref.value?.tagName).toBe('P')
    is.set(false)
    app.render()
    expect(ref.value?.tagName).toBe('DIV')
    is.set(true)
    app.render()
    expect(ref.value?.tagName).toBe('P')
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
        ref.value?.show()
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
