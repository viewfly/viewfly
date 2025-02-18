import 'reflect-metadata'
import { Application, createContext, inject, Injectable } from '@viewfly/core'
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

    const Context = createContext([Show])

    function App() {
      return () => {
        return (
          <div>
            <Page/>
          </div>
        )
      }
    }

    app = createApp(<Context><App/></Context>, false).mount(root)
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

    const Context = createContext([Show, Parent])

    function App() {
      showName = inject(Show).name
      parentName = inject(Parent).name
      return () => {
        return <div></div>
      }
    }

    app = createApp(<Context><App/></Context>, false).mount(root)
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

    const Context1 = createContext([{
      provide: Show,
      useValue: {
        name: 'page'
      }
    }])
    const Context2 = createContext([Show])

    function Page() {
      return () => {
        return (
          <div>
            <Context1><Detail/></Context1>
          </div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <Context2><Page/></Context2>
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

    const Context1 = createContext([{
      provide: Show,
      useValue: {
        name: 'page'
      }
    }])
    const Context2 = createContext([Show])

    function Page(props: any) {
      return () => {
        return (
          <div>
            <Context1>
              {props.children}
            </Context1>
          </div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <Context2>
              <Page>
                <Detail/>
              </Page>
            </Context2>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(name).toBe('page')
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
