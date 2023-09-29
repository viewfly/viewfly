import 'reflect-metadata'
import { inject, Injectable, provide, Application, InjectionToken, getCurrentInstance } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

describe('依赖注入', () => {
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

    app = createApp(<App/>, false).mount(root)
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
      provide([Show, Parent])
      const injector = getCurrentInstance()
      showName = injector.get(Show).name
      parentName = injector.get(Parent).name
      return () => {
        return <div></div>
      }
    }

    app = createApp(<App/>, false).mount(root)
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

    app = createApp(<App/>, false).mount(root)
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

    app = createApp(<App/>, false).mount(root)
    expect(name).toBe('page')
  })
  test('可以在当前层级获取到实例', () => {
    @Injectable()
    class Show {
      name = 'show'
    }

    let name!: string

    function App() {
      provide(Show)
      const injector = getCurrentInstance()
      name = injector.get(Show).name
      return () => {
        return (
          <div></div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
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

    app = createApp(<App/>, false).mount(root)
    expect(name).toBe('show')
    expect(name1).toBe('show')
    expect(name2).toBe('page')
  })

  test('默认不能获取自己提供的数据', () => {
    const token = new InjectionToken<{test: string}>('')

    function App() {
      provide({
        provide: token,
        useValue: { test: 'test' }
      })
      const a = inject(token)
      return () => <div>{a.test}</div>
    }

    expect(() => {
      app = createApp(<App/>, false).mount(root)
    }).toThrow()
  })

  test('可以从应用提供全局服务', () => {
    @Injectable()
    class A {
      name = 'aaa'
    }

    @Injectable()
    class B {
      name = 'bbb'
    }

    @Injectable()
    class C {
      name = 'ccc'
    }

    function App() {
      const a = inject(A)
      const b = inject(B)
      const c = inject(C)
      return () => {
        return <>
          <p>{a.name}</p>
          <p>{b.name}</p>
          <p>{c.name}</p>
        </>
      }
    }

    app = createApp(<App/>, false).provide(A).provide([B, C]).mount(root)
    expect(root.innerHTML).toBe('<p>aaa</p><p>bbb</p><p>ccc</p>')
  })
})
