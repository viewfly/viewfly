import './main.css'

import { createApp } from '@viewfly/platform-browser'
import { Link, RouterModule, RouterOutlet } from '@viewfly/router'

import { Home } from './Home'
import { logRoute } from './log-route'

function App() {
  console.info('[pg-hmr] App setup() 执行')
  let appViewRenders = 0
  return () => {
    appViewRenders += 1
    console.info(`[pg-hmr] App viewRender() 第 ${appViewRenders} 次`)
    return (
    <div class="pg-page">
      <nav class="pg-nav">
        <Link class="pg-link" active="active" exact to="/">
          HMR 多子组件演示
        </Link>
      </nav>
      <RouterOutlet>未匹配到路由</RouterOutlet>
    </div>
    )
  }
}

createApp(<App />).use(new RouterModule({
  hooks: {
    beforeEach(from, to, next) {
      logRoute('beforeEach', {
        from: { pathname: from.pathname, hash: from.hash, queryParams: from.queryParams },
        to: { pathname: to.pathname, hash: to.hash, queryParams: to.queryParams }
      })
      next()
    },
    afterEach(to) {
      logRoute('afterEach', {
        to: { pathname: to.pathname, hash: to.hash, queryParams: to.queryParams }
      })
    }
  },
  routes: [
    { path: '', component: Home }
  ]
})).mount(document.querySelector('#main')!)
