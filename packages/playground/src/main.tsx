import { inject } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { Link, Router, RouterModule, RouterOutlet } from '@viewfly/router'

function Home() {
  const router = inject(Router)
  return () => (
    <div>
      <p>Home</p>
      <button type="button" onClick={() => router.navigateTo('/list')}>去列表</button>
    </div>
  )
}

function List() {
  return () => <div>List</div>
}

function App() {
  return () => (
    <div>
      <nav>
        <Link active="active" exact to="/">Home</Link>
        <Link active="active" to="/list">List</Link>
      </nav>
      <RouterOutlet>
        未匹配到路由
      </RouterOutlet>
    </div>
  )
}

createApp(<App/>).use(new RouterModule({
  routes: [
    { path: '', component: Home },
    { path: 'list', component: List }
  ]
})).mount(document.querySelector('#main')!)
