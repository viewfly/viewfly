import 'reflect-metadata'
import { Link, Router, RouterModule, RouterOutlet } from '@viewfly/router'
import { inject } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

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
        <div>
          <Link id="to-home" class="home" active="active" exact to="/">Home</Link>
          <Link id="to-list" class={['link']} active="active" to="/list" queryParams={{ a: 'xx' }} fragment="testestes">List</Link>
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
      </div>
    )
  }
}

createApp(<App/>).use(new RouterModule()).mount(document.getElementById('main')!)
