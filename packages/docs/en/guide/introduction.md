# Introduction

Viewfly is a **data-driven** `JavaScript` framework. It gives you a **small, predictable** API so you can build rich, interactive user interfaces efficiently.

> Viewfly favors **plain JavaScript**: no bespoke syntax, no changed JavaScript semantics, and no special compile-only environment—you build apps with the language you already know.

A minimal example:

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({
  count: 0
})

function App() {
  return () => <div>{model.count}</div>
}

setInterval(() => model.count++, 1000)

createApp(<App/>).mount(document.getElementById('app'))
```

## Why Viewfly

If you have been building frontends for a while, you have probably run into the same friction we did: some frameworks feel heavy, with a lot of boilerplate for a single component; some are easy to misuse around closures; some lean on syntax that does not compose well with the wider ecosystem; some are very opinionated and invasive; some sit awkwardly with TypeScript.

Today the frontend stack often feels like learning a new language on top of JavaScript.

We believe you can still ship **high-quality, maintainable, straightforward, extensible** code with ordinary JavaScript. That is why Viewfly exists.

Viewfly borrows useful ideas from today’s ecosystem and reflects them in day-to-day APIs:

- **Reactivity and side effects** — APIs such as `reactive`, `createSignal`, and `watch`, along with other hooks, **work outside components as well**, so you can structure data and UI more freely.
- **JSX** — JSX is a declarative way to describe UI; it is expressive and widely adopted across frameworks and has become a common choice for UI-as-code.
- **Function components** — Simple to define and flexible to use, which fits how many teams already think about UI.
- **Dependency injection** — Helps you split concerns, test pieces in isolation, and keep larger apps coherent.
- **`createSignal` / `reactive`** — Pick the reactive style that fits your problem as complexity grows.
- **TypeScript-friendly** — Components are essentially functions, so typing stays natural and you can lean on the compiler for safety.

## About this documentation

This site describes Viewfly’s **public surface** and **recommended usage**. If examples, typings, and runtime behavior disagree, please open an issue on [GitHub Issues](https://github.com/viewfly/viewfly/issues) so we can fix the docs or call out changes in a release.

## Next steps

- [Installation](./installation.md)
- [Quick start](./quick-start.md)
- [Creating an application](./essentials-application.md)
