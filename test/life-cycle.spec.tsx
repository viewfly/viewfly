import { onUnmounted, onMounted, onPropsChanged, onUpdated, createSignal, Application } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { sleep } from './utils'

describe('Hooks: onMounted', () => {
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
  test('组件挂载后执行回调', () => {
    const fn = jest.fn()

    function App() {
      onMounted(fn)
      return () => {
        return <div></div>
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(fn).toBeCalled()
  })

  test('组件更新后不调用回调', () => {
    const fn = jest.fn()

    function App() {
      onMounted(fn)
      const count = createSignal(0)
      return () => {
        return <div onClick={() => {
          count.set(count() + 1)
        }
        }>{count()}</div>
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(fn).toHaveBeenCalledTimes(1)
    root.querySelector('div')!.click()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('组件销毁后调用回调', () => {
    const fn = jest.fn()

    function Child() {
      onMounted(() => {
        return fn
      })
      return () => {
        return <div></div>
      }
    }

    function App() {
      const bool = createSignal(true)
      return () => {
        return <div onClick={() => {
          bool.set(false)
        }
        }>
          {bool() && <Child/>}
        </div>
      }
    }

    app = createApp(<App/>, false).mount(root)
    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('确保生命周期内的数据变更可更新视图', async () => {
    function App() {
      const n = createSignal(0)
      onMounted(() => {
        n.set(1)
      })
      return () => {
        return <div>{n()}</div>
      }
    }
    app = createApp(<App/>).mount(root)

    await sleep(1)
    expect(root.innerHTML).toBe('<div>1</div>')
  })
})

describe('Hooks: onUpdated', () => {
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

  test('组件更新后触发回调', () => {
    const fn = jest.fn()

    function App() {
      const count = createSignal(0)
      onUpdated(fn)
      return () => {
        return <div onClick={() => {
          count.set(count() + 1)
        }
        }>{count()}</div>
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(fn).toHaveBeenCalledTimes(1)
    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(2)

    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('子组件更新后触发回调，父组件一样触发，但兄弟不触发', () => {
    const fn = jest.fn()
    const fn1 = jest.fn()
    const fn2 = jest.fn()

    function Child1() {
      onUpdated(fn2)
      return () => {
        return <p>fn2</p>
      }
    }

    function Child() {
      const count = createSignal(0)
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
            <Child1/>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    root.querySelector('p')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn1).toHaveBeenCalledTimes(2)
    expect(fn2).toHaveBeenCalledTimes(1)

    root.querySelector('p')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn1).toHaveBeenCalledTimes(3)
    expect(fn2).toHaveBeenCalledTimes(1)
  })

  test('组件更新后调用销毁函数', () => {
    const fn = jest.fn()

    function Child() {
      const count = createSignal(0)
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

    app = createApp(<App/>, false).mount(root)
    expect(fn).not.toBeCalled()

    root.querySelector('p')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(1)

    root.querySelector('p')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(2)
  })

  test('取消监听后，不再执行回调', () => {
    const fn = jest.fn()

    function App() {
      const count = createSignal(0)

      function update() {
        if (count() > 1) {
          unListen()
        }
        count.set(count() + 1)
      }

      const unListen = onUpdated(() => {
        fn()
      })
      return () => {
        return (
          <div onClick={update}>{count()}</div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(fn).toHaveBeenCalledTimes(1)

    const div = root.querySelector('div')!
    div.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(2)

    div.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(3)

    div.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(3)
  })
  test('确保生命周期内的数据变更可更新视图', async () => {
    function App() {
      const n = createSignal(0)
      onUpdated(() => {
        n.set(1)
      })
      return () => {
        return <div>{n()}</div>
      }
    }
    app = createApp(<App/>).mount(root)

    await sleep(1)
    expect(root.innerHTML).toBe('<div>1</div>')
  })
})

describe('Hooks: onPropsChanged', () => {
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
      const count = createSignal(0)

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

    app = createApp(<App/>, false).mount(root)
    expect(fn).not.toBeCalled()

    root.querySelector('div')!.click()
    app.render()
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
      const count = createSignal(0)

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

    app = createApp(<App/>, false).mount(root)
    root.querySelector('div')!.click()
    app.render()
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
      const count = createSignal(0)

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

    app = createApp(<App/>, false).mount(root)
    root.querySelector('div')!.click()
    app.render()
    expect(fn).not.toBeCalled()

    root.querySelector('div')!.click()
    app.render()
    expect(fn).toHaveBeenCalledTimes(1)
  })

  test('取消监听后，不再调用回调函数', () => {
    const fn = jest.fn()

    function Child(props) {
      const unListen = onPropsChanged(() => {
        if (props.count > 1) {
          unListen()
        }
        fn()
      })
      return () => {
        return (
          <p>{props.count}</p>
        )
      }
    }

    function App() {
      const count = createSignal(0)

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

    app = createApp(<App/>, false).mount(root)
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

describe('Hooks: onDestroy', () => {
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

  test('组件销毁时调用回调函数', () => {
    const fn = jest.fn()

    function Child() {
      onUnmounted(fn)
      return () => {
        return <div></div>
      }
    }

    function App() {
      const bool = createSignal(true)
      return () => {
        return <div onClick={() => {
          bool.set(false)
        }
        }>
          {bool() && <Child/>}
        </div>
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(fn).not.toBeCalled()
    root.querySelector('div')!.click()
    app.render()

    expect(fn).toHaveBeenCalledTimes(1)
  })
})
