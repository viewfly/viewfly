# Viewfly 路由器

此包为 viewfly 提供路由导航功能，目前只是实现了一批基础功能，更多功能正在完善。

## 基础使用

### 创建路由

```typescript

import { createBrowserRouter } from '@viewfly/router'

const BrowserRouter = createBrowserRouter()

const app = createApp(document.getElementById('app')!,
  <BrowserRouter>
    <App />
  </BrowserRouter>
)

```

### 配置传递

```typescript

import { RouteOutlet } from '@viewfly/router'

function App() {

  const config = [
    {
      path: '/fly',
      component: <span>Viewfly router</span>
    }
  ]

  return () => {
    return (
      <div>
        <RouteOutlet config={config}>
      </div>
    )
  }
}

```

### 导航

```typescript

import { Router } from '@viewfly/router'

const router = useRouter()

router.navigate('/viewfly')

```
