<h1 align="center"><img src="./_source/logo.svg" alt="Viewfly" width="60px" align="center"> Viewfly</h1>

<p align="center">🚀 A simple, approachable, data-driven frontend framework.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@viewfly/core"><img src="https://img.shields.io/npm/v/@viewfly/core" alt="npm version @viewfly/core"></a>
  <a href="https://www.npmjs.com/package/@viewfly/core"><img src="https://img.shields.io/npm/dm/@viewfly/core" alt="npm downloads @viewfly/core"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
</p>

<p align="center"><strong>Languages:</strong> <a href="./README.md">简体中文</a></p>

Why another framework? Front-end work today mostly revolves around a few major stacks, and newer frameworks still attract a lot of attention—shipping something fresh on top is genuinely hard.

Many of them also feel heavy: lots of boilerplate for a component, bespoke syntax or compilation requirements, awkward TypeScript ergonomics, closure footguns, and more. That gap is where Viewfly fits.

## Start here

See the **[official site](https://viewfly.org)**, then the **minimal example** below; install with the **CLI** or **npm**—**no need to clone** this repo.

## Minimal example

A function component returns a **render function**; use **`reactive`** for state and **`createApp`** to mount:

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({ count: 0 })

function App() {
  return () => <div>{model.count}</div>
}

createApp(<App />).mount(document.getElementById('app')!)
```

## Installation

**Prerequisites:** **Vite**, **TypeScript**, and **`@viewfly/*`** versions should line up (**Node** must satisfy your **Vite** version).

### Option A: CLI (recommended)

```bash
npm install -g @viewfly/cli
viewfly create my-app
cd my-app
npm run dev
```

Details: [@viewfly/cli](./packages/cli/README.en.md). You can also run `npx @viewfly/cli create my-app` without a global install.

### Option B: Manual core packages

```bash
npm install @viewfly/core @viewfly/platform-browser
```

**JSX / TSX:** enable automatic JSX runtime in `tsconfig.json` and point `jsxImportSource` at Viewfly (same pattern as React’s setting—only the package name differs):

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

With **Babel**, set `@babel/preset-react` to `runtime: "automatic"` and `importSource: "@viewfly/core"`.

Dependency injection relies on **`reflect-metadata`**. Importing from `@viewfly/core`’s main entry initializes it; if code-splitting breaks that, add `import 'reflect-metadata'` at the very top of your entry (see [@viewfly/core](./packages/core/README.en.md)).

## Packages (typical order)

| Package | Role |
|---------|------|
| [@viewfly/core](./packages/core/README.en.md) | Core: components, reactivity, `signal`, JSX runtime, lifecycle, `inject`, etc. |
| [@viewfly/platform-browser](./packages/platform-browser/README.en.md) | Browser: `createApp`, mount, destroy. |
| [@viewfly/router](./packages/router/README.en.md) | Routing: `RouterModule`, `Link`, `RouterOutlet`, etc. |
| [@viewfly/devtools](./packages/devtools/README.en.md) | Build: `*.scoped.*` styles with Vite / Rollup / Webpack; includes **component HMR** for the **Vite dev server** (not loaded in production builds). See the package readme for the rest. |
| [@viewfly/cli](./packages/cli/README.en.md) | CLI scaffolding for Vite + TypeScript. |

Router and scoped CSS are optional. Scoped CSS needs **`@viewfly/core`** (e.g. `withMark`) **and** **`@viewfly/devtools`**. The **Vite** template from the CLI already includes **`@viewfly/devtools`**; for other setups, see that package’s readme.

*(Chinese README: **[README.md](./README.md)** and each package’s `README.md`.)*

## After cloning (contributing / local runs)

Clone when you contribute to Viewfly, run **playground** from source, or build the docs site locally. This repo is a **pnpm** workspace with published **`@viewfly/*`** packages and examples.

**Requirements:** **Node** `^20.19.0 || >=22.12.0`, **pnpm** (see root `package.json` → `packageManager`).

**Docs (VitePress)** live in **`packages/docs`**: from the repo root, `npm run docs:dev` for a local preview, `npm run docs:build` for static output (under `packages/docs/.vitepress/dist`).

```bash
pnpm install
pnpm dev
```

Starts **`@viewfly/playground`** by default. Build all publishable packages:

```bash
pnpm run build
```

Other scripts live in root `package.json` → `scripts`.

## Sponsorship

If you want to support ongoing maintenance, you can use the QR codes below.

![](./_source/wx.jpg) ![](./_source/alipay.jpg)

## License

MIT
