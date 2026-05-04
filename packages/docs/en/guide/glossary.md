# Glossary

| Term | Meaning |
|------|---------|
| **setup** | Often means the **component body**: the code in the component function that runs **once** on creation—reactive state, lifecycle registration, etc. |
| **Render function** / **component render function** | The function returned from the **component body** (or `render` on a returned object), invoked on each refresh to produce the current `JSX`. |
| **`reactive`** | Wraps an object in a reactive proxy; property access can be tracked as view dependencies. |
| **`createSignal` / signal** | `createSignal(initial)` creates function-style state: `signal()` to read, `signal.set(v)` to write. |
| **`computed`** | Cached derived value; read via **`.value`**. |
| **`watch` / `watchEffect`** | Run callbacks or effects when dependencies change; often auto-cleaned on unmount (see [Reactivity](./essentials-reactivity.md)). |
| **`createApp`** | Create a browser app instance (from **`@viewfly/platform-browser`**). |
| **`mount` / `destroy`** | Attach the app to a DOM node / tear down and clean up. |
| **`Provider` / `inject`** | DI: parents register values; children **`inject`** them (see [Dependency injection](./dependency-injection.md)). |
| **`RouterModule` / `RouterOutlet` / `Link`** | App module, outlet, and declarative links from **`@viewfly/router`** (see [Router](./router.md)). |
| **`withMark`** | Adds custom DOM markers for rendered nodes—pairs with scoped CSS (see [Scoped CSS](./styling/scoped-css.md)). |
