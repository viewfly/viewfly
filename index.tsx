import { createApp } from '@viewfly/platform-browser'
import { Link, RootRouter, Router, RouterOutlet } from '@viewfly/router'

import './index.scss'
import { inject } from '@viewfly/core'

function ListTab1() {
  return () => {
    return (
      <div>listTab1</div>
    )
  }
}

function ListTab2() {
  return () => {
    return (
      <div>listTab2</div>
    )
  }
}

function ListTab3() {
  return () => {
    return (
      <div>listTab3</div>
    )
  }
}

function List() {
  return () => {
    return (
      <div>
        <h3>list</h3>
        <div>
          <Link to='./tab1'>tab1</Link>
          <Link to='./tab1'>tab2</Link>
          <Link to='./tab2'>tab3</Link>
        </div>
        <div>
          <RouterOutlet config={[
            {
              name: 'tab1',
              component: ListTab1
            },
            {
              name: 'tab2',
              component: ListTab2
            },
            {
              name: 'tab3',
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
      <div>detail</div>
    )
  }
}

function Home() {
  const router = inject(Router)
  return () => {
    return (
      <div>
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
            <Link to="/">Home</Link>
            <Link to="/list" queryParams={{ a: 'xx' }}>List</Link>
            <Link to="/detail">Detail</Link>
          </div>
          <div>
            <RouterOutlet config={[
              {
                name: '',
                component: Home
              },
              {
                name: 'list',
                component: Promise.resolve().then(() => List)
              },
              {
                name: 'detail',
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

createApp(document.getElementById('app')!, <App/>)
