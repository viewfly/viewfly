import { inject, Injectable, provide, Viewfly } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

describe('依赖注入', () => {
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

  test('不能在组件外调用', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    expect(() => {
      inject(Show)
    }).toThrow()
  })

  test('数据可以透传', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    let name!: string

    function Detail() {
      const show = inject(Show)
      name = show.name
      return () => {
        return (
          <div>

          </div>
        )
      }
    }

    function Page() {
      return () => {
        return (
          <div>
            <Detail/>
          </div>
        )
      }
    }

    function App() {
      provide(Show)
      return () => {
        return (
          <div>
            <Page/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(name).toBe('show')
  })

  test('可以提供一组 provider', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    @Injectable()
    class Parent {
      name = 'parent'
    }

    let showName: string
    let parentName: string

    function App() {
      const injector = provide([Show, Parent])
      showName = injector.get(Show).name
      parentName = injector.get(Parent).name
      return () => {
        return <div></div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(showName!).toBe('show')
    expect(parentName!).toBe('parent')
  })

  test('数据可以中间拦截', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    let name!: string

    function Detail() {
      const show = inject(Show)
      name = show.name
      return () => {
        return (
          <div>

          </div>
        )
      }
    }

    function Page() {
      provide({
        provide: Show,
        useValue: {
          name: 'page'
        }
      })
      return () => {
        return (
          <div>
            <Detail/>
          </div>
        )
      }
    }

    function App() {
      provide(Show)
      return () => {
        return (
          <div>
            <Page/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(name).toBe('page')
  })

  test('数据和声明的地方无关，只和最终渲染在模板中的位置有关', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    let name!: string

    function Detail() {
      const show = inject(Show)
      name = show.name
      return () => {
        return (
          <div>

          </div>
        )
      }
    }

    function Page(props) {
      provide({
        provide: Show,
        useValue: {
          name: 'page'
        }
      })
      return () => {
        return (
          <div>
            {props.children}
          </div>
        )
      }
    }

    function App() {
      provide(Show)
      return () => {
        return (
          <div>
            <Page>
              <Detail/>
            </Page>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(name).toBe('page')
  })
  test('可以在当前层级获取到实例', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    let name!: string

    function App() {
      const injector = provide(Show)
      name = injector.get(Show).name
      return () => {
        return (
          <div></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(name).toBe('show')
  })
  test('数据未提供之前获取的始终是上一级，提供了只有下级才能获取', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    let name!: string
    let name1!: string
    let name2!: string

    function Detail() {
      const show = inject(Show)
      name2 = show.name
      return () => {
        return (
          <div>

          </div>
        )
      }
    }

    function Page(props) {
      name = inject(Show).name
      provide({
        provide: Show,
        useValue: {
          name: 'page'
        }
      })
      name1 = inject(Show).name
      return () => {
        return (
          <div>
            {props.children}
          </div>
        )
      }
    }

    function App() {
      provide(Show)
      return () => {
        return (
          <div>
            <Page>
              <Detail/>
            </Page>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(name).toBe('show')
    expect(name1).toBe('show')
    expect(name2).toBe('page')
  })
})
