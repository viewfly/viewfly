# 路由

`@viewfly/router` 提供浏览器端路由能力：把 URL 与页面组件映射起来，让“地址变化 -> 视图切换”成为应用的基础能力。

## 阅读指引

如果你是第一次接触这章，建议先读「最小接入」和「路由表怎么写」，先把路由跑起来。  
接着按需求继续往下看：要做页面跳转就看「声明式导航」和「编程式导航」；要处理参数变化和副作用就看「动态参数与读取」；要做权限控制就看「重定向与导航守卫」。遇到异常时，直接跳到文末的排错小节即可。

## 安装

```bash
npm install @viewfly/router
```

## 最小接入

要让应用具备路由导航能力，你需要先实例化 `RouterModule` 并在应用启动前通过 `app.use(...)` 注册。  
`RouterModule` 负责接收路由表，把“地址 -> 页面组件”的映射关系交给路由系统管理。页面层面上，再通过 `RouterOutlet` 放置一个“匹配结果渲染出口”，让当前地址命中的页面显示在指定位置；应用内跳转则用 `Link` 完成，这样既能声明目标路径，也能处理当前链接的激活态。

::: code-group

```tsx [main.tsx]
import { createApp } from '@viewfly/platform-browser'
import { RouterModule } from '@viewfly/router'
import { App } from './app'
import { Home } from './home'
import { List } from './list'

createApp(<App />)
  .use(
    new RouterModule({
      routes: [
        { path: '', component: Home },
        { path: 'list', component: List },
      ],
    }),
  )
  .mount(document.querySelector('#main')!)
```

```tsx [app.tsx]
import { Link, RouterOutlet } from '@viewfly/router'

export function App() {
  return () => (
    <div>
      <nav>
        <Link active="active" exact to="/">
          Home
        </Link>
        <Link active="active" to="/list">
          List
        </Link>
      </nav>
      <RouterOutlet>未匹配到路由</RouterOutlet>
    </div>
  )
}
```

```tsx [home.tsx]
import { inject } from '@viewfly/core'
import { Router } from '@viewfly/router'

export function Home() {
  const router = inject(Router)
  return () => (
    <div>
      <p>首页</p>
      <button type="button" onClick={() => router.navigateTo('/list')}>
        去列表
      </button>
    </div>
  )
}
```

```tsx [list.tsx]
export function List() {
  return () => <div>列表页</div>
}
```

:::

这个最小例子里，三个角色分工是：

- `RouterModule`：注册路由表；
- `Link`：声明式导航；
- `RouterOutlet`：渲染当前匹配到的页面组件。

## 路由表怎么写

最常见的三类路径：

- 普通路径：`'list'`
- 动态参数：`'user/:id'`
- 可选参数：`'user/:id?'`
- 兜底匹配：`'*'`

```tsx
new RouterModule({
  routes: [
    { path: '', component: HomePage },
    { path: 'list', component: ListPage },
    { path: 'user/:id', component: UserPage },
    { path: '*', component: NotFoundPage },
  ],
})
```

建议把 `*` 放在路由表末尾，作为最终兜底页面。

路径匹配采用“前缀消费”语义：当前层路由命中并消费自己负责的路径段后，剩余路径段会继续交给子级 `RouterOutlet` 对应的子路由处理。

## 声明式导航：Link

`Link` 常用属性：

- `to`：目标路径；
- `active`：命中时追加的 class 名；
- `exact`：是否要求精确匹配（通常首页链接会用）。
- `queryParams`：查询参数对象；
- `hash`：hash 片段；
- `tag`：渲染标签（默认是 `a`）。

```tsx
<nav>
  <Link active="active" exact to="/">
    首页
  </Link>
  <Link active="active" to="/list">
    列表
  </Link>
  <Link to="/list" queryParams={{ page: 2 }} hash="top">
    列表第2页
  </Link>
</nav>
```

## 编程式导航：inject(Router)

当你需要在逻辑代码里触发跳转（例如按钮、提交后跳转），可注入 `Router` 使用导航方法。

```tsx
import { inject } from '@viewfly/core'
import { Router } from '@viewfly/router'

function Toolbar() {
  const router = inject(Router)

  return () => (
    <div>
      <button type="button" onClick={() => router.navigateTo('/list')}>
        前往列表
      </button>
      <button type="button" onClick={() => router.replaceTo('/list')}>
        替换到列表
      </button>
      <button
        type="button"
        onClick={() => router.navigateTo('/user/42', { tab: 'profile' }, 'info')}
      >
        打开用户42
      </button>
    </div>
  )
}
```

常用方法：

- `navigateTo(path, queryParams?, hash?)`：跳转并新增历史记录；
- `replaceTo(path, queryParams?, hash?)`：替换当前历史记录；
- `back()` / `forward()` / `go(offset)`：历史前进后退。

## 动态参数与读取

路由参数分两类，语义不同：

- **路径参数（params）**：URL 路径中的动态段，通常用于资源标识，如 `/user/42` 里的 `42`；
- **查询参数（query）**：`?` 后的键值，通常用于筛选、分页、排序，如 `?page=2&keyword=phone`。

先在路由里声明路径参数，再在页面中读取。

```tsx
new RouterModule({
  routes: [{ path: 'user/:id', component: UserPage }],
})
```

```tsx
import { useParams } from '@viewfly/router'

function UserPage() {
  const params = useParams<{ id: string }>()
  return () => <div>用户ID：{params.id}</div>
}
```

查询参数可用 `useQueryParams()` 读取：

```tsx
import { useQueryParams } from '@viewfly/router'

function ListPage() {
  const query = useQueryParams<{ page?: string; keyword?: string }>()
  return () => <div>page={query.page || '1'}</div>
}
```

当地址变化时，`useParams()` / `useQueryParams()` 读到的数据会随路由刷新更新。  
如果你要在参数变化时执行副作用（如重新请求数据），可以这样写：

```tsx
import { watch } from '@viewfly/core'
import { useParams, useQueryParams } from '@viewfly/router'

function UserPage() {
  const params = useParams<{ id: string }>()
  const query = useQueryParams<{ tab?: string }>()

  watch(
    () => params.id,
    (nextId, prevId) => {
      console.log('id changed:', prevId, '->', nextId)
      // 例如：根据 nextId 重新请求用户详情
    },
  )

  watch(
    () => query.tab,
    (nextTab, prevTab) => {
      console.log('tab changed:', prevTab, '->', nextTab)
      // 例如：切换面板数据
    },
  )

  return () => <div>用户页</div>
}
```

可选路径参数（如 `:id?`）在当前实现下未命中时会是空字符串 `''`，不是 `undefined`。业务判断建议显式处理空字符串分支。

### 查询参数写入与读取对应关系

写入：

```tsx
router.navigateTo('/list', { page: '2', tag: ['a', 'b'] }, 'top')
```

URL 结果示意：

```text
/list?page=2&tag=a&tag=b#top
```

读取：

```tsx
const query = useQueryParams<{ page?: string; tag?: string | string[] }>()
```

`queryParams` 支持数组值，因此同一个 key 可以出现多次（如 `tag=a&tag=b`）。读取时该字段可能是 `string` 或 `string[]`，类型上建议显式声明。

## 嵌套路由

父页面中放置 `RouterOutlet`，用于渲染子级匹配内容：

```tsx
function SettingsLayout() {
  return () => (
    <section>
      <h2>设置中心</h2>
      <RouterOutlet>未匹配到设置子页面</RouterOutlet>
    </section>
  )
}
```

这样可以保持“外层布局不变，内层页面切换”的结构。

### 子路由配置（最小示例）

```tsx
new RouterModule({
  routes: [
    {
      path: 'settings',
      component: SettingsLayout,
      children: [
        { path: '', component: ProfilePage },
        { path: 'security', component: SecurityPage },
      ],
    },
  ],
})
```

访问 `/settings` 渲染 `ProfilePage`，访问 `/settings/security` 渲染 `SecurityPage`。

## 命名路由出口（命名视图）

当一个页面区域需要并行渲染多个路由组件时，可使用带 `name` 的 `RouterOutlet` 与 `namedComponents`。

```tsx
function DashboardLayout() {
  return () => (
    <div class="layout">
      <aside>
        <RouterOutlet name="sidebar">默认侧栏</RouterOutlet>
      </aside>
      <main>
        <RouterOutlet>默认主内容</RouterOutlet>
      </main>
    </div>
  )
}
```

```tsx
new RouterModule({
  routes: [
    {
      path: 'dashboard',
      component: DashboardLayout,
      namedComponents: [{ name: 'sidebar', component: DashboardSidebar }],
      children: [{ path: '', component: DashboardHome }],
    },
  ],
})
```

这样同一路由匹配下，主内容和侧栏可由不同组件分别承载。

## 异步路由组件

路由项支持 `asyncComponent`，用于按需加载页面组件：

```tsx
new RouterModule({
  routes: [
    {
      path: 'report',
      asyncComponent: async () => {
        const mod = await import('./pages/report.page')
        return mod.ReportPage
      },
    },
  ],
})
```

子路由配置也可异步返回：

```tsx
{
  path: 'settings',
  component: SettingsLayout,
  children: async () => {
    const mod = await import('./settings.routes')
    return mod.settingsRoutes
  },
}
```

## 重定向与导航守卫

### redirectTo

`redirectTo` 用于“命中当前路径后立即改跳到另一条路径”。常见场景：

- 首页默认跳到某个业务页；
- 老路径兼容到新路径；
- 基于参数把同一入口分发到不同页面。

路由项可使用 `redirectTo` 做跳转：

```tsx
new RouterModule({
  routes: [
    { path: '', redirectTo: 'dashboard' },
    { path: 'dashboard', component: DashboardPage },
  ],
})
```

`redirectTo` 也可以是函数，按当前上下文动态决定跳转目标：

```tsx
{
  path: 'user/:id',
  redirectTo({ params }) {
    return `/profile/${params.id}`
  },
}
```

函数参数里可拿到 `to`、`from`、`params`、`router`，可根据当前导航上下文做动态决策。

### canActivate

`canActivate` 是“进入该路由前的放行检查”。它解决的是“这个页面当前是否允许进入”。

可在路由项里声明 `canActivate`，按返回值控制是否放行：

```tsx
new RouterModule({
  routes: [
    {
      path: 'admin',
      component: AdminPage,
      canActivate() {
        return checkLogin()
      },
    },
  ],
})
```

返回 `true` 放行，返回 `false` 取消本次导航并回滚地址栏到上一个已确认地址。

`canActivate` 会收到一个上下文参数，常用字段如下：

- `to`：本次将要进入的目标地址信息（`pathname`、`queryParams`、`hash`）；
- `from`：上一次已确认的地址信息（首次进入可能为 `null`）；
- `params`：当前匹配到的路径参数（如 `:id`）；
- `router`：当前路由实例，可用于发起进一步导航或读取路由状态。

```tsx
{
  path: 'user/:id',
  component: UserPage,
  canActivate({ to, from, params }) {
    console.log('from:', from?.pathname ?? '(first enter)')
    console.log('to:', to.pathname)
    console.log('user id:', params.id)
    return true
  },
}
```

`canActivate` 支持异步返回：

```tsx
{
  path: 'admin',
  component: AdminPage,
  async canActivate() {
    const ok = await checkPermission()
    return ok
  },
}
```

常见用途：

- 登录校验（未登录不允许进个人中心）；
- 权限校验（无权限不允许进管理页）；
- 前置数据状态校验（依赖前置条件才允许进入）。

## RouterModule 配置

`RouterConfig` 常见字段：

- `baseUrl`：应用基础路径；
- `routes`：路由表；
- `hooks`：导航生命周期钩子（拦截或扩展导航行为）。

### hooks 用法

`hooks.beforeEach` 可在导航发生前控制是否继续（通过调用 `next()`），`hooks.afterEach` 在导航完成后执行：

```tsx
new RouterModule({
  hooks: {
    beforeEach(from, to, next) {
      if (to.pathname.startsWith('/admin') && !checkLogin()) {
        // 不调用 next() 即阻止本次导航
        return
      }
      next()
    },
    afterEach(to) {
      console.log('navigated to', to.pathname)
    },
  },
  routes: [...],
})
```

`beforeEach` 有一个硬约束：放行分支必须调用 `next()`。如果遗漏调用，本次导航会保持 pending，表现为地址或页面“卡住不继续”。

建议：

- 需要拦截时，明确写出“放行条件”和“阻止条件”；
- `beforeEach` 写异步逻辑时，最终也要回到是否调用 `next()` 这个决策点。

字段细节与完整类型以 `@viewfly/router` 当前公开类型定义为准。

## 常见误用与排错

### 1) 症状：地址变了，但页面不渲染

- 原因：布局里没有放 `RouterOutlet`。
- 修复：在承载路由内容的位置补上 `RouterOutlet`。

### 2) 症状：点击 Link 没命中预期路由

- 原因：`to`、`path`、`baseUrl` 之一不一致，或首页链接缺少 `exact` 导致激活判断混乱。
- 修复：逐项核对路径字符串与 `baseUrl`，首页场景使用 `exact`。

### 3) 症状：参数读取为空

- 原因：路由定义不是参数路径（如 `user/:id`），或读取键名与定义不一致。
- 修复：检查路径定义和读取字段是否同名。

### 4) 症状：后退行为和预期不一致

- 原因：使用了 `replaceTo`（替换历史）而不是 `navigateTo`（新增历史）。
- 修复：按是否需要保留历史记录选择对应方法。

### 5) 症状：进入受限页面后瞬间又跳回

- 原因：`canActivate` 返回 `false`，导航被取消。
- 修复：检查守卫逻辑和依赖状态（如登录态、权限态）是否符合预期。

## 下一步

- [创建应用](./essentials-application.md)
- [依赖注入](./dependency-injection.md)
- [应用深入](./application-in-depth.md)
