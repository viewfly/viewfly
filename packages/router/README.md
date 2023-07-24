Viewfly
================================

Viewfly 是一个简单、数据驱动的前端框架。此项目为 Viewfly 的路由库，可让 Viewfly 支持浏览器路由。

## 安装

```
npm install @viewfly/router
```

## 使用示例

```jsx
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
          <Link active="active" to='./tab1'>tab1</Link>
          <Link active="active" to='./tab2'>tab2</Link>
          <Link active="active" to='./tab3'>tab3</Link>
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
            <Link active="active" exact to="/">Home</Link>
            <Link active="active" to="/list" queryParams={{ a: 'xx' }}>List</Link>
            <Link active="active" to="/detail">Detail</Link>
          </div>
          <div>
            <RouterOutlet config={[
              {
                name: 'home',
                component: Home
              },
              {
                name: 'list',
                asyncComponent: () => Promise.resolve().then(() => List)
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
```

完整文档请参考官方网站：[viewfly.org](https://viewfly.org)
