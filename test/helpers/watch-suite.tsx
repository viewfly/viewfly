import { Application, watch } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

interface StateRef<T> {
  get(): T
  set(value: T): void
}

interface WatchSuiteOptions {
  title: string
  createNumberState(initial: number): StateRef<number>
  flush: () => void
}

export function registerWatchSuite(options: WatchSuiteOptions) {
  const { title, createNumberState, flush } = options

  describe(title, () => {
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
      const count = createNumberState(1)
      const fn = jest.fn()
      watch(() => count.get(), (a, b) => {
        fn(a, b)
      })
      count.set(2)
      flush()
      expect(fn).toHaveBeenNthCalledWith(1, 2, 1)
    })

    test('可以监听一组状态的变化', () => {
      const count = createNumberState(1)
      const count2 = createNumberState(1)
      const fn = jest.fn()
      watch(() => [count.get(), count2.get()], (a, b) => {
        fn(a, b)
      })
      count.set(2)
      flush()
      expect(fn).toHaveBeenNthCalledWith(1, [2, 1], [1, 1])
      count2.set(2)
      flush()
      expect(fn).toHaveBeenNthCalledWith(2, [2, 2], [2, 1])
    })

    test('可根据函数自动收集依赖', () => {
      const count = createNumberState(1)
      const fn = jest.fn()
      watch(() => count.get(), (a, b) => {
        fn(a, b)
      })
      count.set(2)
      flush()
      expect(fn).toHaveBeenNthCalledWith(1, 2, 1)
      count.set(3)
      flush()
      expect(fn).toHaveBeenNthCalledWith(2, 3, 2)
    })

    test('组件销毁后不再监听', () => {
      const count = createNumberState(0)
      const fn = jest.fn()

      function Child() {
        watch(() => count.get(), () => {
          fn()
        })
        return () => {
          return <p></p>
        }
      }

      function App() {
        return () => {
          return (
            <div onClick={() => {
              count.set(count.get() + 1)
            }}>
              {count.get() > 1 ? null : <Child/>}
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
}
