# Application in depth

[Creating an application](./essentials-application.md) closed the loop for “create and mount.” This page goes one step further: how the app instance behaves at runtime, and how to organize `provide`, `use`, `render`, and `destroy` in larger codebases.

## Runtime lifecycle

Think of the app instance as a fixed sequence:

1. `createApp(root, ...)` — construct the instance and queue configuration.
2. `provide(...)` / `use(...)` — wire root providers and modules **before** startup.
3. `mount(container)` — start the app and render once.
4. `render()` (optional) — manually schedule another paint.
5. `destroy()` — tear down the app and run module cleanup.

Two rules matter: **each instance allows only one successful `mount`**—a second call throws an “already started” style error; **after `destroy()`** do not treat that instance as reusable—create a new one to restart.

## `autoUpdate` and `render()` refresh modes

`createApp` accepts either:

- `createApp(root, autoUpdate?: boolean)`
- `createApp(root, config?: Partial<ConfigWithoutRoot>)`

### Default: automatic refresh

`autoUpdate` defaults to `true`. Reactive changes follow the normal scheduling path into the view.

```tsx
const app = createApp(<App />)
app.mount(document.getElementById('app')!)
// subsequent reactive updates repaint automatically
```

### Manual: explicit refresh

With `autoUpdate` set to `false`, only the first render runs; later updates require **`app.render()`**.

```tsx
const app = createApp(<App />, { autoUpdate: false })
app.mount(document.getElementById('app')!)

// after state that affects the view changes, trigger a render
app.render()
```

Common in tests, externally driven schedulers, or when batching many writes into one controlled paint. For the basics, see [Creating an application](./essentials-application.md).

## `Module` hooks

Register modules with `app.use(module)`. Typical hooks:

- **`setup(app)`** — runs during `mount`, **before** the first render; wire providers and one-time setup.
- **`onAfterStartup(app)`** — after the first render; work that needs a “UI is up” environment.
- **`onDestroy()`** — when `app.destroy()` runs; release listeners, timers, connections, etc.

```tsx
import type { Module } from '@viewfly/core'

const MetricsModule: Module = {
  setup(app) {
    app.provide([{ provide: METRICS_ENABLED, useValue: true }])
  },
  onAfterStartup() {
    startMetricsCollect()
  },
  onDestroy() {
    stopMetricsCollect()
  },
}
```

Multiple modules run in **`use(...)` registration order**. If modules depend on each other, make that order explicit to avoid hidden coupling.

## App-level wiring: `provide` and `use`

Two common strategies:

### Central entry assembly

Declare base dependencies and core modules in one place—clear structure for most apps.

```tsx
createApp(<App />)
  .provide([ConfigService, LoggerService])
  .use([RouterModule, MetricsModule])
  .mount(document.getElementById('app')!)
```

### Self-wiring modules

Modules add their own providers inside `setup`—good for pluggable or well-bounded features.

```tsx
const FeatureModule: Module = {
  setup(app) {
    app.provide([{ provide: FEATURE_FLAG, useValue: true }])
  },
}
```

Combine both: globals at the entry, domain providers inside modules.  
For `scope`, dynamic registration, and advanced DI, see [Dependency injection in depth](./dependency-injection-in-depth.md).

## Teardown and cleanup

`destroy()` is not only “remove the page”—it must run the **app-level cleanup chain**, especially each module’s `onDestroy()`.

Call `destroy()` when unmounting micro-frontend child apps, replacing the app on a new root, or in test teardown.

If a module opens side-effectful resources (subscriptions, timers, sockets), **release them in `onDestroy()`** to avoid leaks and duplicate work.

## Troubleshooting

### 1) Second `mount` throws

One start per instance. **Fix:** `destroy` the old app and `createApp` again, or use a fresh instance.

### 2) State changes but UI stays stale

Often **`autoUpdate: false`** without `app.render()`. **Fix:** call `render()` after relevant updates, or re-enable auto update.

### 3) Subscriptions/logging after navigation or unmount

Side effects created in `setup` / `onAfterStartup` without matching **`onDestroy`**. **Fix:** unsubscribe, clear timers, close connections in `onDestroy()`.

## Next steps

- [Dependency injection in depth](./dependency-injection-in-depth.md)
- [Router](./router.md)
- [Scoped CSS](./styling/scoped-css.md)
