# @viewfly/platform-browser

**Languages:** [简体中文](./README.md)

Browser entrypoint for Viewfly apps: create the root app, mount to the DOM, destroy, and related DOM-facing APIs.

Install and configure **`@viewfly/core`** first (JSX, `reflect-metadata`, etc.).

---

## Install

```bash
npm install @viewfly/platform-browser @viewfly/core
```

---

## Create and mount

HTML mount target:

```html
<div id="app"></div>
```

Script:

```tsx
import { createApp } from '@viewfly/platform-browser'

function App() {
  return () => <div>Hello Viewfly</div>
}

const app = createApp(<App />)
app.mount(document.getElementById('app')!)

// when needed
app.destroy()
```

---

Refer to typings and the official docs for full API surface.

---

## Docs

- Official site: <https://viewfly.org> (creating an app, lifecycle).
- **`@viewfly/platform-browser`** typings for parameter/return details.

---

## License

MIT
