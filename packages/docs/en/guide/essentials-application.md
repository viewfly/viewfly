# Creating an application

In the browser, Viewfly creates an app with **`createApp`** and attaches it to a real **`DOM`** node via **`mount`**. This page covers the entry point, lifecycle, and application-instance APIs. For install and toolchain setup, see [Installation](./installation.md).

## From entry to pixels

1. **Pick a mount target**: e.g. `<div id="app"></div>` in `index.html`.  
2. **Create the app**: call `createApp(<App />)` from your entry file.  
3. **Mount**: after `mount(container)`, the first render runs.  
4. **Teardown (optional)**: when you are done, call `destroy()` to release resources.

Think of the pipeline as: **`DOM` container → `createApp(root JSX)` → `mount(container)` → `destroy()` (optional)**.

## Minimal runnable example

Ensure the page contains **`#app`**, then mount the root component:

```html
<div id="app"></div>
```

```tsx
import { createApp } from '@viewfly/platform-browser'
import { reactive } from '@viewfly/core'

function App() {
  const model = reactive({ n: 0 })
  return () => <button type="button" onClick={() => model.n++}>{model.n}</button>
}

const el = document.getElementById('app')
if (!el) {
  throw new Error('Mount target #app is missing')
}

const app = createApp(<App />)
app.mount(el)
```

`mount` must receive a real DOM node. If `getElementById` can return `null`, guard explicitly as above.

These two styles are equivalent. When you need `provide` / `use`, chaining is common:

```tsx
const app = createApp(<App />)
app.mount(el)

createApp(<App />).mount(el)
```

## Common methods on the app instance

`createApp` returns an application instance (typed as `Application`). Typical members:

| Method | Role |
|--------|------|
| **`createApp(root, options?)`** | Build an instance from root `JSX`. The second argument can be a `boolean` (auto-update on/off) or an options object. |
| **`mount(container)`** | Mount and run the first render; each instance allows only one successful `mount`. |
| **`destroy()`** | Tear down the app and run module cleanup. |
| **`provide(providers)`** | Register DI `Provider`s at the app root (one or an array). |
| **`use(module)`** | Register `Module`(s) **before** `mount`. |
| **`render()`** | When auto-update is off, manually refresh the view. |

Chained example:

```tsx
createApp(<App />)
  .provide(/* Provider | Provider[] */)
  .use(/* Module | Module[] */)
  .mount(document.getElementById('app')!)
```

## Order of `provide`, `use`, and `mount`

Prefer: **`createApp(<Root />)`**, then **`provide(...)`** and **`use(...)`** before **`mount(container)`**. A `Module`’s `setup` runs during the mount flow, so **`use(...)` must happen first**.

## Pitfalls and debugging

- **Double `mount`**: calling **`mount`** again on the same instance throws an error such as **`application has already started.`** For a new root or a fresh app, **`destroy`** and **`createApp`** again, or use another instance.  
- **Skipping `destroy`**: in long-lived SPAs, when removing the root, swapping stacks, or in some tests, call **`destroy()`** so updates and module logic do not leak.  
- **Wrong mount target**: mismatched **`id`** vs **`getElementById`**, or scripts running before the **`DOM`** is ready, yields **`null`** or the wrong node—often a blank screen or content in the wrong place.  

## Manual refresh mode (optional)

When you want to drive updates yourself (tests or external schedulers), pass **`false`** as the second argument to `createApp` (or **`{ autoUpdate: false }`**):

```tsx
const app = createApp(<App />, false)
app.mount(document.getElementById('app')!)

// After state changes, refresh manually
app.render()
```

Full semantics and more cases are in [Application in depth](./application-in-depth.md) under the `autoUpdate` / `render()` sections.

## Next steps

- [JSX & components](./essentials-components.md)  
- [Reactivity](./essentials-reactivity.md)  
- [Application in depth](./application-in-depth.md) — **`autoUpdate`**, **`render`**, **`Module`** hooks  
- [Router](./router.md) — optional; see **At scale** in the sidebar  
