import { Application, Module } from '@viewfly/core';
import { createApp } from '@viewfly/platform-browser';

describe('Core', () => {
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

  test('正常调用模块勾子', () => {
    function App() {
      return () => (<div>test</div>)
    }

    const fn1 = jest.fn()
    const fn2 = jest.fn()
    const fn3 = jest.fn()

    const moduleA: Module = {
      setup(app: Application) {
        fn1()
      },
      onAfterStartup(app: Application) {
        fn2()
      },
      onDestroy() {
        fn3()
      }
    }

    app = createApp(<App/>, {
      autoUpdate: false
    }).use(moduleA).mount(root)

    app.destroy()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn3).toHaveBeenCalledTimes(1)
  })

  test('模块支持数组并允许空对象', () => {
    function App() {
      return () => (<div>test</div>)
    }

    const fn1 = jest.fn()
    const fn2 = jest.fn()
    const fn3 = jest.fn()

    const moduleA: Module = {
      setup(app: Application) {
        fn1()
      },
      onAfterStartup(app: Application) {
        fn2()
      },
      onDestroy() {
        fn3()
      }
    }

    app = createApp(<App/>, {
      autoUpdate: false
    }).use([moduleA, {}]).mount(root)

    app.destroy()

    expect(fn1).toHaveBeenCalledTimes(1)
    expect(fn2).toHaveBeenCalledTimes(1)
    expect(fn3).toHaveBeenCalledTimes(1)
  })
})
