# Router

`@viewfly/router` adds browser routing: map URLs to page components so **URL changes drive view changes**.

## How to read this chapter

If this is your first pass, start with **Minimal setup** and **Defining routes** to get routing running. Then dive where you need: **declarative navigation** and **programmatic navigation** for jumps; **Dynamic params** for param-driven effects; **Redirects & guards** for access control. For bugs, jump to **Troubleshooting** at the end.

## Install

```bash
npm install @viewfly/router
```

## Minimal setup

To enable routing:

1. Construct **`RouterModule`** and register it with **`app.use(...)`** before the app renders.
2. **`RouterModule`** owns the route table—the mapping from addresses to page components.
3. Place **`RouterOutlet`** where matched views should render.
4. Use **`Link`** for in-app navigation and active styling.

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
      <RouterOutlet>No route matched</RouterOutlet>
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
      <p>Home</p>
      <button type="button" onClick={() => router.navigateTo('/list')}>
        Go to list
      </button>
    </div>
  )
}
```

```tsx [list.tsx]
export function List() {
  return () => <div>List page</div>
}
```

:::

Roles in this example:

- **`RouterModule`**: registers the route table;
- **`Link`**: declarative navigation;
- **`RouterOutlet`**: renders the matched page component.

## Defining routes

Common path shapes:

- Static segment: `'list'`
- Dynamic param: `'user/:id'`
- Optional param: `'user/:id?'`
- Catch-all: `'*'`

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

Put `*` **last** as the final fallback.

Matching uses a **prefix consumption** model: when a level matches and consumes its segment, the remainder flows to the child `RouterOutlet` / child routes.

## Declarative navigation: `Link`

Common props:

- `to`: destination path;
- `active`: class name appended while matched;
- `exact`: require exact match (often for home);
- `queryParams`: query object;
- `hash`: hash fragment;
- `tag`: rendered tag (default `a`).

```tsx
<nav>
  <Link active="active" exact to="/">
    Home
  </Link>
  <Link active="active" to="/list">
    List
  </Link>
  <Link to="/list" queryParams={{ page: 2 }} hash="top">
    List page 2
  </Link>
</nav>
```

## Programmatic navigation: `inject(Router)`

For jumps from logic (buttons, after submit), inject **`Router`**.

```tsx
import { inject } from '@viewfly/core'
import { Router } from '@viewfly/router'

function Toolbar() {
  const router = inject(Router)

  return () => (
    <div>
      <button type="button" onClick={() => router.navigateTo('/list')}>
        Go to list
      </button>
      <button type="button" onClick={() => router.replaceTo('/list')}>
        Replace with list
      </button>
      <button
        type="button"
        onClick={() => router.navigateTo('/user/42', { tab: 'profile' }, 'info')}
      >
        Open user 42
      </button>
    </div>
  )
}
```

Common methods:

- `navigateTo(path, queryParams?, hash?)` — push history entry;
- `replaceTo(path, queryParams?, hash?)` — replace current entry;
- `back()` / `forward()` / `go(offset)` — history navigation.

## Dynamic params and reads

Two families with different meaning:

- **Path params (`params`)**: dynamic URL segments—resource identity, e.g. `42` in `/user/42`;
- **Query params (`query`)**: `?key=value`—filters, paging, sort, e.g. `?page=2&keyword=phone`.

Declare path params in the route, read them in the page.

```tsx
new RouterModule({
  routes: [{ path: 'user/:id', component: UserPage }],
})
```

```tsx
import { useParams } from '@viewfly/router'

function UserPage() {
  const params = useParams<{ id: string }>()
  return () => <div>User id: {params.id}</div>
}
```

Use `useQueryParams()` for the query string:

```tsx
import { useQueryParams } from '@viewfly/router'

function ListPage() {
  const query = useQueryParams<{ page?: string; keyword?: string }>()
  return () => <div>page={query.page || '1'}</div>
}
```

When the URL changes, `useParams()` / `useQueryParams()` update accordingly.  
To run side effects on param changes (refetch, etc.):

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
      // e.g. refetch user by nextId
    },
  )

  watch(
    () => query.tab,
    (nextTab, prevTab) => {
      console.log('tab changed:', prevTab, '->', nextTab)
      // e.g. swap panel data
    },
  )

  return () => <div>User page</div>
}
```

For optional path params (`:id?`), when missing the current implementation yields an **empty string** `''`, not `undefined`. Handle `''` explicitly in business logic.

### Writing vs reading query params

Write:

```tsx
router.navigateTo('/list', { page: '2', tag: ['a', 'b'] }, 'top')
```

Resulting URL shape:

```text
/list?page=2&tag=a&tag=b#top
```

Read:

```tsx
const query = useQueryParams<{ page?: string; tag?: string | string[] }>()
```

`queryParams` accepts array values, so one key may repeat (`tag=a&tag=b`). The read field may be `string` or `string[]`—type it explicitly.

## Nested routes

Parent layouts render **`RouterOutlet`** for child matches:

```tsx
function SettingsLayout() {
  return () => (
    <section>
      <h2>Settings</h2>
      <RouterOutlet>No settings child matched</RouterOutlet>
    </section>
  )
}
```

Keeps **outer chrome stable** while **inner pages swap**.

### Child route config (minimal)

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

`/settings` → `ProfilePage`; `/settings/security` → `SecurityPage`.

## Named outlets

When one screen needs **parallel** routed regions, use named **`RouterOutlet`** values with **`namedComponents`**.

```tsx
function DashboardLayout() {
  return () => (
    <div class="layout">
      <aside>
        <RouterOutlet name="sidebar">Default sidebar</RouterOutlet>
      </aside>
      <main>
        <RouterOutlet>Default main</RouterOutlet>
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

One match can feed both main and sidebar components.

## Async route components

Routes support **`asyncComponent`** for lazy pages:

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

Child routes can be async too:

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

## Redirects and navigation guards

### `redirectTo`

`redirectTo` jumps **immediately** after the route matches. Typical uses:

- default landing page;
- legacy path aliases;
- branching one entry by params.

Static redirect:

```tsx
new RouterModule({
  routes: [
    { path: '', redirectTo: 'dashboard' },
    { path: 'dashboard', component: DashboardPage },
  ],
})
```

`redirectTo` may be a function that returns the target from context:

```tsx
{
  path: 'user/:id',
  redirectTo({ params }) {
    return `/profile/${params.id}`
  },
}
```

The argument exposes `to`, `from`, `params`, `router` for dynamic decisions.

### `canActivate`

`canActivate` runs **before entering** a route—answers “may we open this page now?”.

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

`true` continues; `false` **aborts** navigation and rolls the address bar back to the last confirmed URL.

Context fields:

- `to`: target (`pathname`, `queryParams`, `hash`);
- `from`: previous confirmed location (`null` on first entry);
- `params`: matched path params (e.g. `:id`);
- `router`: router instance for further navigation or state reads.

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

`canActivate` may be async:

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

Typical uses: login checks, permission gates, prerequisite state.

## `RouterModule` options

`RouterConfig` highlights:

- `baseUrl`: app base path;
- `routes`: route table;
- `hooks`: navigation lifecycle hooks.

### `hooks`

`hooks.beforeEach` can block navigation by calling `next()`; `hooks.afterEach` runs after navigation completes:

```tsx
new RouterModule({
  hooks: {
    beforeEach(from, to, next) {
      if (to.pathname.startsWith('/admin') && !checkLogin()) {
        // omit next() to block
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

**Hard rule for `beforeEach`:** the allow branch **must** call `next()`. Forgetting leaves navigation **pending**—URL or UI appears stuck.

Tips:

- Spell out allow vs deny paths clearly;
- async work must still end in “call `next()` or not”.

Full field list and types: see **`@viewfly/router`** public typings.

## Troubleshooting

### 1) URL changes but nothing renders

- **Cause**: no `RouterOutlet` in the layout.
- **Fix**: add `RouterOutlet` where routed content should appear.

### 2) `Link` does not match expectations

- **Cause**: `to`, `path`, or `baseUrl` disagree, or home lacks `exact` for active state.
- **Fix**: align path strings and `baseUrl`; use `exact` on home when needed.

### 3) Params read empty

- **Cause**: route path is not parametric (`user/:id`), or key names differ.
- **Fix**: match route definition and reader keys.

### 4) Back button surprises

- **Cause**: `replaceTo` (replace history) vs `navigateTo` (push).
- **Fix**: choose based on whether history should retain the current entry.

### 5) Guarded page flashes then bounces

- **Cause**: `canActivate` returned `false`.
- **Fix**: review guard logic and auth/permission state.

## Next steps

- [Creating an application](./essentials-application.md)
- [Dependency injection](./dependency-injection.md)
- [Application in depth](./application-in-depth.md)
