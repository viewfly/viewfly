# @viewfly/core

**Languages:** [简体中文](./README.md)

The **core** Viewfly package: function components, JSX, reactivity and `signal`, `watch`, lifecycle, `inject` / IoC APIs, and **`withMark`** for UI-facing utilities.

To mount in the browser use **`createApp`** from **`@viewfly/platform-browser`** (built on this package’s application model).

---

## Install

```bash
npm install @viewfly/core
```

This package depends on **`reflect-metadata`**. Importing from the **`@viewfly/core`** main entry initializes it; if DI breaks after aggressive splitting, add at the **top** of your entry:

```ts
import 'reflect-metadata'
```

Prefer the **`.d.ts`** shipped with your installed version and the official docs (<https://viewfly.org>) as the source of truth.

---

## JSX / TSX setup

Enable automatic JSX runtime and point it at this package:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

With Babel, align `@babel/preset-react` (`runtime: "automatic"`, `importSource: "@viewfly/core"`).

---

## Capabilities (user-facing)

Common directions below — **exact types and parameters come from `.d.ts` and the docs**.

| Area | Public API hints |
|------|------------------|
| Components | Function components as JSX tags; pair with lifecycle hooks. |
| Lifecycle | **`onMounted`**, **`onUpdated`**, **`onUnmounted`**, etc. (call during component setup). |
| Reactivity | **`reactive`**, **`shallowReactive`**, **`watch`**, … (`reactive` module). |
| `signal` / derived | **`createSignal`**, **`computed`**, … (see `reactive` exports). |
| DI | **`inject`** in components; **`Injectable()`** on classes; **`withAnnotation`** or **`createContext`** / **`createContextProvider`** for providers; root **`createApp(...).provide(...)`** from **`@viewfly/platform-browser`**. |
| DOM marks | **`withMark(marks, setup)`** — attach attributes (e.g. scoped CSS `scopeId`). |

Symbols marked **`@internal`** or undocumented on the site are for framework/experimental use — **avoid relying on them** in apps; they may change without semver guarantees.

---

## Docs & examples

- **Official docs:** <https://viewfly.org> (install, components, reactivity, DI).
- **Types & comments:** published **`.d.ts`** and source comments.
- **This repo:** `pnpm install` at root, then `pnpm dev` for the playground.

---

## License

MIT
