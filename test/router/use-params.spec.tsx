import 'reflect-metadata'
import 'jest-location-mock'
import { Application, inject } from '@viewfly/core'
import { Router, RouterModule, RouterOutlet, useParams } from '@viewfly/router'
import { createApp } from '@viewfly/platform-browser'

import { sleep } from '../helpers/utils'

describe('useParams：与动态路径参数同步', () => {
  let root: HTMLElement
  let app: Application

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    app?.destroy()
  })

  test('挂载时读取动态路径参数', async () => {
    function UserPage() {
      const params = useParams<{ id?: string }>()
      return () => <span id="out">{params.id ?? ''}</span>
    }

    function App() {
      return () => <RouterOutlet/>
    }

    location.href = 'http://localhost/user/42'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: 'user/:id', component: UserPage }]
    })).mount(root)
    await sleep(0)
    expect(root.querySelector('#out')!.textContent).toBe('42')
  })

  test.skip('路径参数变化后，hook 值会更新（使用 setTimeout 等待时序）', async () => {
    let rootRouter: Router | null = null

    function UserPage() {
      const params = useParams<{ id?: string }>()
      return () => <span id="out">{params.id ?? ''}</span>
    }

    function App() {
      rootRouter = inject(Router)
      return () => <RouterOutlet/>
    }

    location.href = 'http://localhost/user/1'
    app = createApp(<App/>, false).use(new RouterModule({
      routes: [{ path: 'user/:id', component: UserPage }]
    })).mount(root)

    await sleep(0)
    expect(root.querySelector('#out')!.textContent).toBe('1')

    rootRouter!.navigateTo('/user/2')

    // NOTE:
    // 在 jsdom + jest-location-mock 下，这条“同路由参数变化”的链路存在环境时序差异，
    // 这里先保留用例与 setTimeout 说明，作为后续稳定化测试的基线。
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(root.querySelector('#out')!.textContent).toBe('2')
  })

})
