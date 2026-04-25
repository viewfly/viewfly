import './index.css'

import { createApp } from '@viewfly/platform-browser'
import { Link, RouterModule, RouterOutlet } from '@viewfly/router'

import { KeyedBenchmarkPage } from './pages/keyed-benchmark'
import { LocalTestPage } from './pages/local-test'

const routeConfig = [
  { path: '', component: LocalTestPage },
  { path: 'keyed-benchmark', component: KeyedBenchmarkPage },
]

function PlaygroundNav() {
  return () => {
    return (
      <nav class="navbar navbar-expand border-bottom mb-3 py-2 bg-body-tertiary">
        <div class="container-fluid px-0">
          <span class="navbar-brand mb-0 h6 text-muted">Playground</span>
          <div class="navbar-nav flex-row gap-2">
            <Link to="/" exact class="nav-link" active="active">
              本地测试
            </Link>
            <Link to="/keyed-benchmark" exact class="nav-link" active="active">
              Keyed 列表
            </Link>
          </div>
        </div>
      </nav>
    )
  }
}

function App() {
  return () => {
    return (
      <div class="container">
        <PlaygroundNav/>
        <RouterOutlet config={routeConfig}/>
      </div>
    )
  }
}

createApp(<App/>).use(new RouterModule()).mount(document.querySelector('#main')!)
