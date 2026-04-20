import 'reflect-metadata'
import 'jest-location-mock'
import { Application } from '@viewfly/core'
import { RouterModule, RouterOutlet, useQueryParams } from '@viewfly/router'
import { createApp } from '@viewfly/platform-browser'

describe('useQueryParams：与地址栏查询参数同步', () => {
  let root: HTMLElement
  let app: Application

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    app?.destroy()
  })

  test('挂载时从当前 URL 读取查询参数', () => {
    function Page() {
      const q = useQueryParams<{ name?: string; n?: string }>()
      return () => <span id="out">{`${q.name ?? ''}|${q.n ?? ''}`}</span>
    }

    function App() {
      return () => (
        <RouterOutlet config={[{ path: '', component: Page }]}/>
      )
    }

    location.href = 'http://localhost/?name=hi&n=3'
    app = createApp(<App/>, false).use(new RouterModule()).mount(root)
    expect(root.querySelector('#out')!.textContent).toBe('hi|3')
  })

  test('返回对象为只读代理，Reflect.set 会抛出', () => {
    function Page() {
      const q = useQueryParams<{ x?: string }>()
      expect(() => Reflect.set(q as object, 'x', 'y')).toThrow(/readonly/)
      return () => <span id="ok">ok</span>
    }

    function App() {
      return () => <RouterOutlet config={[{ path: '', component: Page }]}/>
    }

    location.href = 'http://localhost/?x=1'
    app = createApp(<App/>, false).use(new RouterModule()).mount(root)
    expect(root.querySelector('#ok')).not.toBeNull()
  })
})
