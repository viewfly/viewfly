# @viewfly/router

基于 **Viewfly** 的浏览器端路由：声明式链接、嵌套路由出口、编程式导航等。需配合 **`@viewfly/core`** 与 **`@viewfly/platform-browser`** 使用。

---

## 安装

```bash
pnpm add @viewfly/router @viewfly/platform-browser @viewfly/core
```

---

## 接入应用

1. 使用 **`RouterModule`** 作为应用级扩展（通过 `createApp(...).use(...)` 注册）。
2. 在布局中用 **`Link`** 生成导航，用 **`RouterOutlet`** 根据配置渲染匹配到的组件。
3. 在组件内通过 **`inject(Router)`** 拿到路由实例，调用 **`navigateTo`** 等方法做跳转。

最小串联示例（节选，完整路由表与懒加载等见官网）：

```tsx
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
      <RouterOutlet
        config={[
          { name: 'home', component: Home },
          { name: 'list', component: List }
        ]}
      >
        未匹配到路由
      </RouterOutlet>
    </div>
  )
}

createApp(<App />)
  .use(new RouterModule())
  .mount(document.getElementById('app')!)
```

**嵌套路由**：在子页面组件内再次放置 `RouterOutlet`，并为其传入子级 `config`（与官网「路由」章节一致）。

---

## 文档

- **官方文档**：[viewfly.org](https://viewfly.org)

---

## License

MIT
