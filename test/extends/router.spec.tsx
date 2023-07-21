import 'jest-location-mock'
import { inject, Viewfly } from '@viewfly/core'
import { Link, RootRouter, Router, RouterOutlet, Navigator } from '@viewfly/router'
import { createApp } from '@viewfly/platform-browser'
import { sleep } from '../utils'

describe('路由基本能力验证', () => {
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

  test('没提供上下文时，Link 组件报错', () => {
    function App() {
      return () => {
        return (
          <div>
            <Link to='/'>test</Link>
          </div>
        )
      }
    }

    expect(() => {
      app = createApp(<App/>).mount(root)
    }).toThrow()
  })

  test('没有提供上下文时， RouterOutlet 组件报错', () => {
    function App() {
      return () => {
        return (
          <div>
            <RouterOutlet config={[]}/>
          </div>
        )
      }
    }

    expect(() => {
      app = createApp(<App/>).mount(root)
    }).toThrow()
  })

  test('提供上下文时，Link 正常渲染', () => {
    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <Link to='/'>test</Link>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><a to="/" href="/">test</a></div>')
  })

  test('提供上下文时， RouterOutlet 正常渲染', () => {
    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet config={[]}/>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div></div>')
  })

  test('没有匹配项， RouterOutlet 展示默认 children', () => {
    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet config={[]}>children</RouterOutlet>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div>children</div>')
  })

  test('Link 可生成正常的链接地址', () => {
    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <Link to='/'>test</Link>
              <Link to='/test'>test</Link>
              <Link to='test'>test</Link>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><a to="/" href="/">test</a><a to="/test" href="/test">test</a><a to="test" href="/test">test</a></div>')
  })

  test('Link 可根据相对路径向上找', () => {
    function Child() {
      return () => {
        return (
          <p>
            <Link to='../../test'>test</Link>
          </p>
        )
      }
    }

    function Home() {
      return () => {
        return (
          <div>
            <RouterOutlet config={[
              {
                path: 'child',
                component: Child
              }
            ]}/>
          </div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet config={[
                {
                  path: 'home',
                  component: Home
                }
              ]}/>
            </RootRouter>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home/child'
    app = createApp(<App/>, false).mount(root)
    expect(root.querySelector('a')!.href).toBe('http://localhost/test')
  })

  test('Link 可生成正常加 baseUrl 的链接地址', () => {
    function App() {
      return () => {
        return (
          <div>
            <RootRouter basePath="/path/to">
              <Link to='/'>test</Link>
              <Link to='/test'>test</Link>
              <Link to='../test'>test</Link>
              <Link to='./test'>test</Link>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><a to="/" href="/path/to/">test</a><a to="/test" href="/path/to/test">test</a><a to="../test" href="/path/to/test">test</a><a to="./test" href="/path/to/test">test</a></div>')
  })

  test('Link 可生成正常加 baseUrl 的链接地址', () => {
    function App() {
      return () => {
        return (
          <div>
            <RootRouter basePath="/path/to">
              <Link to='/'>test</Link>
              <Link to='/test'>test</Link>
              <Link to='../test'>test</Link>
              <Link to='./test'>test</Link>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><a to="/" href="/path/to/">test</a><a to="/test" href="/path/to/test">test</a><a to="../test" href="/path/to/test">test</a><a to="./test" href="/path/to/test">test</a></div>')
  })

  test('路由高亮匹配字符串', () => {
    function App() {
      return () => {
        return (
          <Link to="/home" class="home" active="active"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    expect(root.querySelector('a')!.className).toBe('home active')
  })

  test('路由高亮匹配数组', () => {
    function App() {
      return () => {
        return (
          <Link to="/home" class={['home']} active="active"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    expect(root.querySelector('a')!.className).toBe('home active')
  })

  test('路由高亮匹配对象', () => {
    function App() {
      return () => {
        return (
          <Link to="/home" class={{ home: true }} active="active"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    expect(root.querySelector('a')!.className).toBe('home active')
  })

  test('路由高亮匹配添加', () => {
    function App() {
      return () => {
        return (
          <Link to="/home" active="active"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    expect(root.querySelector('a')!.className).toBe('active')
  })

  test('新窗口打开链接', () => {
    const fn = jest.spyOn(history, 'pushState')

    function App() {
      return () => {
        return (
          <>
            <Link to="/home" target="_blank" active="active"/>
            <Link tag="a" to="/home" target="_blank" active="active"/>
          </>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    root.querySelectorAll('a')[0].click()
    root.querySelectorAll('a')[1].click()
    expect(fn).not.toBeCalled()
  })

  test('参数支持', () => {
    function App() {
      return () => {
        return (
          <Link to="/home" target="_blank" queryParams={{ a: ['1', '2'] }} active="active"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    expect(root.querySelector('a')!.href).toBe('http://localhost/home?a=1&a=2')
  })

  test('防止重提', () => {
    const fn = jest.spyOn(history, 'pushState')

    function App() {
      return () => {
        return (
          <Link to="/test"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    const a = root.querySelector('a')!
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    location.href = 'http://localhost/test'
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    fn.mockClear()
  })

  test('防止替换重提', () => {
    const fn = jest.spyOn(history, 'replaceState')

    function App() {
      const router = inject(Router)
      return () => {
        return (
          <button onClick={() => {
            router.replaceTo('/test')
          }} type="button"></button>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    const a = root.querySelector('button')!
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    location.href = 'http://localhost/test'
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    fn.mockClear()
  })
})

describe('根据 URL 渲染', () => {
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

  test('匹配空路由', () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      const router = inject(Router)
      expect(router.pathname).toBe('')
      return () => {
        return (
          <div>
            <RouterOutlet config={[{
              path: '',
              component: Home
            }]}/>
          </div>
        )
      }
    }

    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)
    expect(root.innerHTML).toBe('<div><p>home</p></div>')
  })

  test('匹配命名路由', () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet config={[{
                path: 'home',
                component: Home
              }]}/>
            </RootRouter>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><p>home</p></div>')
  })

  test('匹配回退组件', () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet config={[{
                path: '*',
                component: Home
              }]}/>
            </RootRouter>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><p>home</p></div>')
  })
  test('不匹配时无效', () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet config={[{
                path: 'test',
                component: Home
              }]}/>
            </RootRouter>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div></div>')
  })

  test('支持异步组件', async () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <RouterOutlet configs={[{
                name: 'home',
                asyncComponent: () => Promise.resolve().then(() => Home)
              }]}/>
            </RootRouter>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>).mount(root)
    expect(root.innerHTML).toBe('<div></div>')

    await sleep(1)

    expect(root.innerHTML).toBe('<div><p>home</p></div>')
  })
})

describe('基础跳转功能调用', () => {
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

  test('基础方法', () => {
    const backFn = jest.spyOn(history, 'back')
    const forwardFn = jest.spyOn(history, 'forward')
    const goFn = jest.spyOn(history, 'go')

    function App() {
      const router = inject(Router)
      return () => {
        return (
          <>
            <button onClick={() => {
              router.back()
            }}>back
            </button>
            <button onClick={() => {
              router.forward()
            }}>back
            </button>
            <button onClick={() => {
              router.go(1)
            }}>back
            </button>
          </>
        )
      }
    }

    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)

    const btns = root.querySelectorAll('button')
    btns[0].click()
    expect(backFn).toHaveBeenCalledTimes(1)
    btns[1].click()
    expect(forwardFn).toHaveBeenCalledTimes(1)
    btns[2].click()
    expect(goFn).toHaveBeenNthCalledWith(1, 1)
  })
})

describe('根据路由跳转', () => {
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

  test('点击跳转', async () => {
    const fn = jest.spyOn(history, 'pushState')

    function ListTab1() {
      return () => {
        return (
          <div id="tab1">listTab1</div>
        )
      }
    }

    function ListTab2() {
      return () => {
        return (
          <div id="tab2">listTab2</div>
        )
      }
    }

    function ListTab3() {
      return () => {
        return (
          <div id="tab3">listTab3</div>
        )
      }
    }

    function List() {
      return () => {
        return (
          <div id="list">
            <h3>list</h3>
            <div>
              <Link id="to-tab1" active="active" to='./tab1'>tab1</Link>
              <Link id="to-tab2" active="active" to='./tab2'>tab2</Link>
              <Link id="to-tab3" active="active" to='./tab3'>tab3</Link>
            </div>
            <div>
              <RouterOutlet config={[
                {
                  path: 'tab1',
                  component: ListTab1
                },
                {
                  path: 'tab2',
                  component: ListTab2
                },
                {
                  path: 'tab3',
                  component: ListTab3
                }
              ]}>没找到 Tab</RouterOutlet>
            </div>
          </div>
        )
      }
    }

    function Detail() {
      return () => {
        return (
          <div id="detail">detail</div>
        )
      }
    }

    function Home() {
      const router = inject(Router)
      return () => {
        return (
          <div id="home">
            <div>home</div>
            <button type="button" onClick={() => {
              router.navigateTo('../list')
            }
            }>跳转到列表
            </button>
          </div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RootRouter>
              <div>
                <Link id="to-home" class="home" active="active" exact to="/">Home</Link>
                <Link id="to-list" class={['link']} active="active" to="/list" queryParams={{ a: 'xx' }}>List</Link>
                <Link id="to-detail" class={{ show: true }} active="active" to="/detail">Detail</Link>
              </div>
              <div>
                <RouterOutlet config={[
                  {
                    path: '',
                    component: Home
                  },
                  {
                    path: 'list',
                    component: List
                  },
                  {
                    path: 'detail',
                    component: Detail
                  }
                ]}>
                  未匹配到任何路由
                </RouterOutlet>
              </div>
            </RootRouter>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)

    expect(root.querySelector('#home')).not.toBeNull();

    (root.querySelector('#to-detail') as HTMLLinkElement).click()
    expect(fn).toHaveBeenNthCalledWith(1, null, '', '/detail')
    app.destroy()
    expect(root.innerHTML).toBe('')

    location.href = 'http://localhost/detail'
    app = createApp(<App/>, false).mount(root)
    expect(root.querySelector('#detail')).not.toBeNull();
    app.destroy()
    expect(root.innerHTML).toBe('')


    location.href = 'http://localhost/list'
    app = createApp(<App/>, false).mount(root)
    expect(root.querySelector('#list')).not.toBeNull();
  })

  test('监听浏览器 popState', () => {
    const fn = jest.spyOn(window, 'addEventListener')
    const fn1 = jest.fn()

    function App() {
      const navigator = inject(Navigator)
      navigator.onUrlChanged.subscribe(() => {
        fn1()
      })
      return () => {
        return <p>test</p>
      }
    }

    app = createApp(<RootRouter><App/></RootRouter>, false).mount(root)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn1).toHaveBeenCalledTimes(0)

    const mock = fn.mock as any
    mock.calls[0][1]()
    expect(fn1).toHaveBeenCalledTimes(1)
    fn.mockClear()
  })
})
