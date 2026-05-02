# @viewfly/router

**Languages:** [简体中文](./README.md)

Browser routing for **Viewfly**: declarative links, nested outlets, programmatic navigation. Requires **`@viewfly/core`** and **`@viewfly/platform-browser`**.

---

## Install

```bash
npm install @viewfly/router @viewfly/platform-browser @viewfly/core
```

---

## Wiring into the app

1. Register **`RouterModule`** at app level (`createApp(...).use(...)`).
2. Use **`Link`** for nav and **`RouterOutlet`** to render the matched view.
3. **`inject(Router)`** inside components, then **`navigateTo(path, queryParams?, hash?)`** / **`replaceTo`** — the second argument is the **query object** (distinct from path **`Router.params`** / **`useParams()`**).

Minimal sketch (extend with your route table, lazy loading, etc.):

```tsx
import { inject } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { Link, Router, RouterModule, RouterOutlet } from '@viewfly/router'

function Home() {
  const router = inject(Router)
  return () => (
    <div>
      <p>Home</p>
      <button type="button" onClick={() => router.navigateTo('/list')}>Go to list</button>
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
        No route matched
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

```

**Nested routes:** place another `RouterOutlet` in child layouts and pass nested route config.

---

## Docs

- Official docs: <https://viewfly.org/guide/router>
- **`@viewfly/router`** typings.

---

## License

MIT
