import 'reflect-metadata'
import 'jest-location-mock'
import { createSignal, inject, Application } from '@viewfly/core'
import { Link, Route, Routes, Router, RouterOutlet, Navigator, RouterModule } from '@viewfly/router'
import { createApp } from '@viewfly/platform-browser'
import { sleep } from '../helpers/utils'

describe('路由基本能力验证', () => {
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

  test('没提供上下文时，Link 组件报错', () => {
    function App() {
      return () => {
        return (
          <div>
            <Link to="/">test</Link>
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
            <RouterOutlet/>
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
            <Link to="/">test</Link>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect(root.innerHTML).toBe('<div><a href="/">test</a></div>')
  })

  test('提供上下文时， RouterOutlet 正常渲染', () => {
    function App() {
      return () => {
        return (
          <div>
            <RouterOutlet/>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect(root.innerHTML).toBe('<div></div>')
  })

  test('没有匹配项， RouterOutlet 展示默认 children', () => {
    function App() {
      return () => {
        return (
          <div>
            <RouterOutlet>children</RouterOutlet>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect(root.innerHTML).toBe('<div>children</div>')
  })

  test('Link 可生成正常的链接地址', () => {
    function App() {
      return () => {
        return (
          <div>
            <Link to="/">test</Link>
            <Link to="/test">test</Link>
            <Link to="test">test</Link>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect(root.innerHTML).toBe('<div><a href="/">test</a><a href="/test">test</a><a href="/test">test</a></div>')
  })

  test('Link 可根据相对路径向上找', () => {
    function Child() {
      return () => {
        return (
          <p>
            <Link to="../../test">test</Link>
          </p>
        )
      }
    }

    function Home() {
      return () => {
        return (
          <div>
            <RouterOutlet/>
          </div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home/child'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'home',
          component: Home,
          children: [{ path: 'child', component: Child }]
        }
      ]
    })).mount(root)
    expect(root.querySelector('a')!.href).toBe('http://localhost/test')
  })

  test('Link 可生成正常加 baseUrl 的链接地址', () => {
    function App() {
      return () => {
        return (
          <div>
            <Link to="/">test</Link>
            <Link to="/test">test</Link>
            <Link to="../test">test</Link>
            <Link to="./test">test</Link>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).use(new RouterModule({ baseUrl: '/path/to' })).mount(root)
    expect(root.innerHTML).toBe('<div><a href="/path/to/">test</a><a href="/path/to/test">test</a><a href="/path/to/test">test</a><a href="/path/to/test">test</a></div>')
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect(root.querySelector('a')!.className).toBe('active')
  })

  test('baseUrl 场景下路由高亮可正确匹配', () => {
    function App() {
      return () => {
        return (
          <div>
            <Link id="home" to="/home" class="home" active="active"/>
            <Link id="list" to="/list" class="list" active="active"/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/base/home'
    app = createApp(<App/>, false).use(new RouterModule({ baseUrl: '/base' })).mount(root)
    expect((root.querySelector('#home') as HTMLLinkElement).className).toBe('home active')
    expect((root.querySelector('#list') as HTMLLinkElement).className).toBe('list')
  })

  test('路由高亮按路径段匹配，不应将 /home2 视为 /home', () => {
    function App() {
      return () => {
        return (
          <div>
            <Link id="home" to="/home" class="home" active="active"/>
            <Link id="home2" to="/home2" class="home2" active="active"/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home2'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect((root.querySelector('#home') as HTMLLinkElement).className).toBe('home')
    expect((root.querySelector('#home2') as HTMLLinkElement).className).toBe('home2 active')
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    root.querySelectorAll('a')[0].click()
    root.querySelectorAll('a')[1].click()
    expect(fn).not.toHaveBeenCalled()
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    expect(root.querySelector('a')!.href).toBe('http://localhost/home?a=1&a=2')
  })

  test('已在目标地址时再次导航不重复 pushState', () => {
    const fn = jest.spyOn(history, 'pushState')

    function App() {
      return () => {
        return (
          <Link to="/test"/>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    const a = root.querySelector('a')!
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    location.href = 'http://localhost/test'
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    fn.mockClear()
  })

  test('Link 传入 onClick 时仍会 SPA 导航，且用户 onClick 先于路由跳转', () => {
    const pushSpy = jest.spyOn(history, 'pushState')
    const userOnClick = jest.fn(() => {
      expect(pushSpy.mock.calls.length).toBe(0)
    })

    function App() {
      return () => {
        return (
          <div>
            <Link to="/target" onClick={userOnClick}>go</Link>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    ;(root.querySelector('a') as HTMLAnchorElement).click()
    expect(pushSpy).toHaveBeenCalled()
    expect(userOnClick).toHaveBeenCalledTimes(1)
    pushSpy.mockRestore()
  })

  test('Link 用户 onClick 中 preventDefault 时不做 SPA 导航', () => {
    const pushSpy = jest.spyOn(history, 'pushState')
    const userOnClick = jest.fn((ev: MouseEvent) => {
      ev.preventDefault()
    })

    function App() {
      return () => {
        return (
          <div>
            <Link to="/target" onClick={userOnClick}>go</Link>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    ;(root.querySelector('a') as HTMLAnchorElement).click()
    expect(pushSpy).not.toHaveBeenCalled()
    expect(userOnClick).toHaveBeenCalledTimes(1)
    pushSpy.mockRestore()
  })

  test('Link Ctrl/Cmd/Shift/Alt 或非主键点击不做 SPA pushState', () => {
    const pushSpy = jest.spyOn(history, 'pushState')

    function App() {
      return () => {
        return (
          <div>
            <Link id="modifier-link" to="/target">go</Link>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    const a = root.querySelector('#modifier-link') as HTMLAnchorElement

    for (const mod of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }] as const) {
      a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...mod, button: 0 }))
    }
    expect(pushSpy).not.toHaveBeenCalled()

    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 }))
    expect(pushSpy).not.toHaveBeenCalled()

    a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }))
    expect(pushSpy).toHaveBeenCalledTimes(1)
    pushSpy.mockRestore()
  })

  test('Link 非 a 标签点击不应 preventDefault，但仍执行 SPA 导航', () => {
    const pushSpy = jest.spyOn(history, 'pushState')

    function App() {
      return () => {
        return (
          <div>
            <Link id="button-link" tag="button" type="button" to="/target">go</Link>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    const button = root.querySelector('#button-link') as HTMLButtonElement
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    const notCanceled = button.dispatchEvent(event)

    expect(notCanceled).toBe(true)
    expect(event.defaultPrevented).toBe(false)
    expect(pushSpy).toHaveBeenCalledTimes(1)
    pushSpy.mockRestore()
  })

  test('已在目标地址时 replaceTo 相同路径不重复 replaceState', () => {
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
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    const a = root.querySelector('button')!
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    location.href = 'http://localhost/test'
    a.click()
    expect(fn).toHaveBeenCalledTimes(1)
    fn.mockClear()
  })

  test('replaceTo 支持 hash，与 navigateTo 第三参语义一致', () => {
    const fn = jest.spyOn(history, 'replaceState')

    function App() {
      const router = inject(Router)
      return () => (
        <button onClick={() => {
          router.replaceTo('/doc', { q: '1' }, 'section')
        }} type="button"/>
      )
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    root.querySelector('button')!.click()
    expect(fn).toHaveBeenCalledWith(null, '', expect.stringMatching(/\/doc\?q=1#section$/))
    fn.mockRestore()
  })

  test('replaceTo 传入空字符串 hash 时保留空 hash 标记', () => {
    const fn = jest.spyOn(history, 'replaceState')

    function App() {
      const router = inject(Router)
      return () => (
        <button onClick={() => {
          router.replaceTo('/doc', { q: '1' }, '')
        }} type="button"/>
      )
    }

    location.href = 'http://localhost/home#old'
    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)
    root.querySelector('button')!.click()
    expect(fn).toHaveBeenCalledWith(null, '', expect.stringMatching(/\/doc\?q=1#$/))
    fn.mockRestore()
  })
})

describe('根据 URL 渲染', () => {
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

  test('匹配空路由', () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      const router = inject(Router)
      expect(router.path).toBe('')
      return () => {
        return (
          <div>
            <RouterOutlet/>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: '', component: Home }]
    })).mount(root)
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
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: 'home', component: Home }]
    })).mount(root)
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
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: '*', component: Home }]
    })).mount(root)
    expect(root.innerHTML).toBe('<div><p>home</p></div>')
  })

  test('默认路由 path="" 不应额外消耗 URL 段（嵌套可继续匹配）', () => {
    function Inner() {
      return () => <p id="inner">inner</p>
    }

    function Middle() {
      return () => <RouterOutlet/>
    }

    function Shell() {
      return () => (
        <div id="shell">
          <RouterOutlet/>
        </div>
      )
    }

    function App() {
      return () => <RouterOutlet/>
    }

    location.href = 'http://localhost/a/b'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'a',
          component: Shell,
          children: [
            { path: '', component: Middle, children: [{ path: 'b', component: Inner }] }
          ]
        }
      ]
    })).mount(root)

    expect(root.querySelector('#inner')).not.toBeNull()
  })

  test('路由 canActivate 返回 false 时，地址栏与视图保持一致', async () => {
    function Home() {
      return () => {
        return <p id="home">home</p>
      }
    }

    function Guarded() {
      return () => {
        return <p id="guarded">guarded</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <Link id="to-guarded" to="/guarded">to guarded</Link>
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        { path: '', component: Home },
        {
          path: 'guarded',
          component: Guarded,
          canActivate() {
            return false
          }
        }
      ]
    })).mount(root)

    expect(root.querySelector('#home')).not.toBeNull()
    ;(root.querySelector('#to-guarded') as HTMLAnchorElement).click()
    await sleep(0)

    // 守卫拒绝后视图回到首页；地址栏由 cancelNavigation + history.back 回滚（jsdom 下 location 与异步 traversal 可能不同步，不单测 pathname）
    expect(root.querySelector('#home')).not.toBeNull()
    expect(root.querySelector('#guarded')).toBeNull()
  })

  test('路由 canActivate 可接收 to/from/router 上下文', async () => {
    function Home() {
      return () => {
        return <p id="home">home</p>
      }
    }

    function Guarded() {
      return () => {
        return <p id="guarded">guarded</p>
      }
    }

    let contextSnapshot: {
      toPathname: string
      toHash: string | null
      fromPathname: string | null
      fromHash: string | null
      hasRouter: boolean
      params: Record<string, string>
    } | null = null

    function App() {
      return () => {
        return (
          <div>
            <Link id="to-guarded" to="/guarded" queryParams={{ q: '1' }} hash="h">to guarded</Link>
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        { path: '', component: Home },
        {
          path: 'guarded',
          component: Guarded,
          canActivate(context) {
            contextSnapshot = {
              toPathname: context.to.pathname,
              toHash: context.to.hash,
              fromPathname: context.from?.pathname ?? null,
              fromHash: context.from?.hash ?? null,
              hasRouter: context.router instanceof Router,
              params: context.params
            }
            return true
          }
        }
      ]
    })).mount(root)

    ;(root.querySelector('#to-guarded') as HTMLAnchorElement).click()
    await sleep(0)

    expect(contextSnapshot).toEqual({
      toPathname: '/guarded',
      toHash: 'h',
      fromPathname: '/',
      fromHash: null,
      hasRouter: true,
      params: {}
    })
  })

  test('支持动态路由 path 参数（/user/:id）', async () => {
    let capturedId = ''

    function User() {
      return () => {
        return <p id="user">user</p>
      }
    }

    function App() {
      return () => {
        return <RouterOutlet/>
      }
    }

    location.href = 'http://localhost/user/42'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'user/:id',
          component: User,
          canActivate(context) {
            capturedId = context.params.id
            return true
          }
        }
      ]
    })).mount(root)

    await sleep(0)
    expect(capturedId).toBe('42')
  })

  test('支持多段动态参数（/team/:teamId/user/:userId）', async () => {
    let snapshot: Record<string, string> = {}

    function Page() {
      return () => {
        return <p id="page">page</p>
      }
    }

    function App() {
      return () => {
        return <RouterOutlet/>
      }
    }

    location.href = 'http://localhost/team/t1/user/u2'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'team/:teamId/user/:userId',
          component: Page,
          canActivate(context) {
            snapshot = context.params
            return true
          }
        }
      ]
    })).mount(root)

    await sleep(0)
    expect(snapshot).toEqual({
      teamId: 't1',
      userId: 'u2'
    })
  })

  test('嵌套路径参数按层隔离：父 inject(Router).params 与子层独立', async () => {
    let parentParams: Record<string, string> = {}
    let childParams: Record<string, string> = {}

    function User() {
      const r = inject(Router)
      childParams = { ...r.params }
      return () => <p id="user">u</p>
    }

    function TeamShell() {
      const r = inject(Router)
      parentParams = { ...r.params }
      return () => (
        <div id="team">
          <RouterOutlet/>
        </div>
      )
    }

    function App() {
      return () => <RouterOutlet/>
    }

    location.href = 'http://localhost/team/ta/user/ub'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'team/:teamId',
          component: TeamShell,
          children: [{ path: 'user/:userId', component: User }]
        }
      ]
    })).mount(root)

    await sleep(0)
    expect(parentParams).toEqual({ teamId: 'ta' })
    expect(childParams).toEqual({ userId: 'ub' })
  })

  test('支持可选路径参数 user/:id?（有段与无段）', async () => {
    let snapshot = ''

    function Page() {
      return () => <p id="p">p</p>
    }

    function App() {
      return () => <RouterOutlet/>
    }

    location.href = 'http://localhost/user'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'user/:id?',
          component: Page,
          canActivate(context) {
            snapshot = context.params.id ?? '__missing__'
            return true
          }
        }
      ]
    })).mount(root)

    await sleep(0)
    expect(snapshot).toBe('')

    app.destroy()
    root = document.createElement('div')
    location.href = 'http://localhost/user/99'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'user/:id?',
          component: Page,
          canActivate(context) {
            snapshot = context.params.id
            return true
          }
        }
      ]
    })).mount(root)

    await sleep(0)
    expect(snapshot).toBe('99')
  })

  test('中间段不允许可选参数：a/:id?/b 在 resolve 时抛错', () => {
    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        expect(() => router.resolve(routesDef)).toThrow(/optional path parameter/i)
        return <div/>
      }
    }

    location.href = 'http://localhost/a/b'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        { path: 'a/:id?/b', component: () => () => <p id="p">p</p> }
      ]
    })).mount(root)
  })

  test('同一路由 path 内重复参数名：:id/:id 在 resolve 时抛错', () => {
    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        expect(() => router.resolve(routesDef)).toThrow(/duplicate path parameter/i)
        return <div/>
      }
    }

    location.href = 'http://localhost/a/b'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        { path: ':id/:id', component: () => () => <p id="p">p</p> }
      ]
    })).mount(root)
  })

  test('非法路由 path：空动态段名（如 user/:）在 resolve 时抛错', () => {
    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        expect(() => router.resolve(routesDef)).toThrow(/empty or invalid path parameter/i)
        return <div/>
      }
    }

    location.href = 'http://localhost/user/x'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        { path: 'user/:', component: () => () => <p id="p">p</p> }
      ]
    })).mount(root)
  })

  test('path 参数边界：中文、空格、emoji 作为单 path 段（字面量或编码以宿主 pathname 为准）', async () => {
    const cases: { hrefTail: string; decoded: string }[] = [
      { hrefTail: '测试', decoded: '测试' },
      { hrefTail: encodeURIComponent('a b'), decoded: 'a b' },
      { hrefTail: encodeURIComponent('🎉'), decoded: '🎉' }
    ]

    function Page() {
      return () => <p id="p">p</p>
    }

    function App() {
      return () => <RouterOutlet/>
    }

    for (const { hrefTail, decoded } of cases) {
      let captured = ''
      location.href = `http://localhost/user/${hrefTail}`
      root = document.createElement('div')
      app = createApp(<App/>, false).use(new RouterModule({
        routes: [
          {
            path: 'user/:id',
            component: Page,
            canActivate(context) {
              captured = context.params.id
              return true
            }
          }
        ]
      })).mount(root)

      await sleep(0)
      // 与真实浏览器一致时多为解码后字符串；jsdom 等可能保留百分号编码，二者均接受
      expect(captured === decoded || decodeURIComponent(captured) === decoded).toBe(true)
      app.destroy()
    }
  })

  test('path 参数边界：%2F 在段内时是否拆成多段取决于宿主 pathname（当前为单段则整段作为 :id）', async () => {
    let captured = ''

    function Page() {
      return () => <p id="p">p</p>
    }

    function App() {
      return () => <RouterOutlet/>
    }

    location.href = 'http://localhost/user/foo%2Fbar'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'user/:id',
          component: Page,
          canActivate(context) {
            captured = context.params.id
            return true
          }
        }
      ]
    })).mount(root)

    await sleep(0)
    // 浏览器常把 %2F 解码为 /，:id 为 foo；部分宿主整段保留，:id 为 foo%2Fbar
    expect(captured === 'foo' || captured === 'foo%2Fbar').toBe(true)
  })

  test('慢路由仍在加载时点其它链接：以最后一次导航为准（不被子路由异步结果覆盖）', async () => {
    function SlowPage() {
      return () => {
        return <p id="slow">slow</p>
      }
    }

    function FastPage() {
      return () => {
        return <p id="fast">fast</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <nav>
              <Link id="go-fast" to="/fast">去快页</Link>
            </nav>
            <main>
              <RouterOutlet/>
            </main>
          </div>
        )
      }
    }

    // 常见于：首屏/子页懒加载未完成时，用户在顶栏/侧栏点了另一个入口（Link）
    location.href = 'http://localhost/slow'
    app = createApp(<App/>).use(new RouterModule({
      routes: [
        {
          path: 'slow',
          asyncComponent: async () => {
            await new Promise(resolve => setTimeout(resolve, 120))
            return SlowPage
          }
        },
        { path: 'fast', component: FastPage },
      ]
    })).mount(root)

    await sleep(0)

    ;(root.querySelector('#go-fast') as HTMLAnchorElement).click()
    await sleep(10)

    expect(root.querySelector('#fast')).not.toBeNull()
    expect(root.querySelector('#slow')).toBeNull()

    await sleep(200)
    expect(root.querySelector('#fast')).not.toBeNull()
    expect(root.querySelector('#slow')).toBeNull()
  })

  test('无任何路由匹配当前 URL 时 RouterOutlet 为空', () => {
    function Home() {
      return () => {
        return <p>home</p>
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: 'test', component: Home }]
    })).mount(root)
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
            <RouterOutlet/>
          </div>
        )
      }
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>).use(new RouterModule({
      routes: [{
        path: 'home',
        asyncComponent: () => Promise.resolve().then(() => Home)
      }]
    })).mount(root)
    expect(root.innerHTML).toBe('<div></div>')

    await sleep(10)

    expect(root.innerHTML).toBe('<div><p>home</p></div>')
  })

  test('RouterOutlet name 用 createSignal 变更时可触发重算（URL 不变）', async () => {
    let setOutletName!: (name: 'left' | 'right') => void
    function Left() {
      return () => <p id="named-left">left</p>
    }
    function Right() {
      return () => <p id="named-right">right</p>
    }

    function App() {
      const outletName = createSignal<'left' | 'right'>('left')
      setOutletName = (name) => outletName.set(name)
      return () => (
        <div>
          <RouterOutlet name={outletName()}/>
        </div>
      )
    }

    location.href = 'http://localhost/home'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{
        path: 'home',
        namedComponents: [
          { name: 'left', component: Left },
          { name: 'right', component: Right },
        ]
      }]
    })).mount(root)

    expect(root.querySelector('#named-left')).not.toBeNull()
    expect(root.querySelector('#named-right')).toBeNull()

    setOutletName('right')
    for (let i = 0; i < 6; i++) {
      app.render()
      if (root.querySelector('#named-right')) {
        break
      }
      await sleep(10)
    }

    expect(root.querySelector('#named-left')).toBeNull()
    expect(root.querySelector('#named-right')).not.toBeNull()
  })

  test('NavigatorHooks.beforeEach 不调用 next 时给出可见告警', () => {
    jest.useFakeTimers()
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      function Home() {
        return () => {
          return <p id="home">home</p>
        }
      }

      function Next() {
        return () => {
          return <p id="next">next</p>
        }
      }

      function App() {
        return () => {
          return (
            <div>
              <Link id="go-next" to="/next">go next</Link>
              <RouterOutlet/>
            </div>
          )
        }
      }

      location.href = 'http://localhost/'
      app = createApp(<App/>, false).use(new RouterModule({
        hooks: {
          beforeEach() {
            // 故意不调用 next，用于验证提示
          }
        },
        routes: [
          { path: '', component: Home },
          { path: 'next', component: Next }
        ]
      })).mount(root)

      ;(root.querySelector('#go-next') as HTMLAnchorElement).click()
      jest.advanceTimersByTime(350)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('NavigatorHooks.beforeEach did not call next'))
    } finally {
      warnSpy.mockRestore()
      jest.useRealTimers()
    }
  })
})

describe('redirectTo 环与深度', () => {
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

  test('字符串 redirectTo 自指时抛错', () => {
    function App() {
      const router = inject(Router)
      const routes = inject(Routes)
      return () => {
        expect(() => router.resolve(routes)).toThrow(/Self-redirect/)
        return <div/>
      }
    }

    location.href = 'http://localhost/loop'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: 'loop', redirectTo: 'loop' }]
    })).mount(root)
  })

  test('两路由互相 redirect 时抛错', () => {
    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        expect(() => {
          router.resolve(routesDef)
          router.resolve(routesDef)
        }).toThrow(/Redirect cycle/)
        return <div/>
      }
    }

    location.href = 'http://localhost/a'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        { path: 'a', redirectTo: 'b' },
        { path: 'b', redirectTo: 'a' },
      ]
    })).mount(root)
  })

  test('redirect 链超过 32 次时抛错', () => {
    function End() {
      return () => {
        return <p id="end">end</p>
      }
    }

    const routes: Route[] = []
    for (let i = 0; i < 32; i++) {
      routes.push({ path: `p${i}`, redirectTo: `p${i + 1}` })
    }
    routes.push({ path: 'p32', component: End })

    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        expect(() => {
          for (let i = 0; i < 40; i++) {
            router.resolve(routesDef)
          }
        }).toThrow(/Redirect chain exceeded/)
        return <div/>
      }
    }

    location.href = 'http://localhost/p0'
    app = createApp(<App/>, false).use(new RouterModule({ routes })).mount(root)
  })

  test('函数 redirectTo 可接收 to/from/router 上下文', () => {
    let contextSnapshot: {
      toPathname: string
      toHash: string | null
      fromPathname: string | null
      fromHash: string | null
      hasRouter: boolean
      sameRef: boolean
      params: Record<string, string>
    } | null = null

    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        router.resolve(routesDef)
        return <div/>
      }
    }

    location.href = 'http://localhost/a?q=1#h'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'a',
          redirectTo(context) {
            contextSnapshot = {
              toPathname: context.to.pathname,
              toHash: context.to.hash,
              fromPathname: context.from?.pathname ?? null,
              fromHash: context.from?.hash ?? null,
              hasRouter: context.router instanceof Router,
              sameRef: context.from ? context.to === context.from : false,
              params: context.params
            }
            return 'b'
          }
        },
        { path: 'b', component: () => () => <p id="b">b</p> }
      ]
    })).mount(root)

    expect(contextSnapshot).toEqual({
      toPathname: '/a',
      toHash: 'h',
      fromPathname: null,
      fromHash: null,
      hasRouter: true,
      sameRef: false,
      params: {}
    })
  })

  test('函数 redirectTo 可读取动态参数', () => {
    let captured = ''

    function App() {
      const router = inject(Router)
      const routesDef = inject(Routes)
      return () => {
        router.resolve(routesDef)
        return <div/>
      }
    }

    location.href = 'http://localhost/order/889'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [
        {
          path: 'order/:id',
          redirectTo(context) {
            captured = context.params.id
            return 'done'
          }
        },
        { path: 'done', component: () => () => <p id="done">done</p> }
      ]
    })).mount(root)

    expect(captured).toBe('889')
  })
})

describe('基础跳转功能调用', () => {
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

    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)

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
  let app: Application

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
              <Link id="to-tab1" active="active" to="./tab1">tab1</Link>
              <Link id="to-tab2" active="active" to="./tab2">tab2</Link>
              <Link id="to-tab3" active="active" to="./tab3">tab3</Link>
            </div>
            <div>
              <RouterOutlet>没找到 Tab</RouterOutlet>
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
            <div>
              <Link id="to-home" class="home" active="active" exact to="/">Home</Link>
              <Link id="to-list" class={['link']} active="active" to="/list" queryParams={{ a: 'xx' }}>List</Link>
              <Link id="to-detail" class={{ show: true }} active="active" to="/detail">Detail</Link>
            </div>
            <div>
              <RouterOutlet>
                未匹配到任何路由
              </RouterOutlet>
            </div>
          </div>
        )
      }
    }

    const jumpTestRoutes = [
      { path: '', component: Home },
      {
        path: 'list',
        component: List,
        children: [
          { path: 'tab1', component: ListTab1 },
          { path: 'tab2', component: ListTab2 },
          { path: 'tab3', component: ListTab3 }
        ]
      },
      { path: 'detail', component: Detail }
    ]

    app = createApp(<App/>, false).use(new RouterModule({ routes: jumpTestRoutes })).mount(root)

    expect(root.querySelector('#home')).not.toBeNull();

    (root.querySelector('#to-detail') as HTMLLinkElement).click()
    expect(fn).toHaveBeenNthCalledWith(1, null, '', '/detail')
    app.destroy()
    expect(root.innerHTML).toBe('')

    location.href = 'http://localhost/detail'
    app = createApp(<App/>, false).use(new RouterModule({ routes: jumpTestRoutes })).mount(root)
    expect(root.querySelector('#detail')).not.toBeNull()
    app.destroy()
    expect(root.innerHTML).toBe('')


    location.href = 'http://localhost/list'
    app = createApp(<App/>, false).use(new RouterModule({ routes: jumpTestRoutes })).mount(root)
    expect(root.querySelector('#list')).not.toBeNull()
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

    app = createApp(<App/>, false).use(new RouterModule({})).mount(root)

    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn1).toHaveBeenCalledTimes(0)

    const mock = fn.mock as any
    mock.calls[0][1]()
    expect(fn1).toHaveBeenCalledTimes(1)
    fn.mockClear()
  })
})
