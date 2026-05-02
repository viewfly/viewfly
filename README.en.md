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

- **Official site:** <https://viewfly.org>
- **Docs source (VitePress):** **`packages/docs`** — after cloning, run `npm run docs:dev` locally or `npm run docs:build` (output in `packages/docs/.vitepress/dist`).
- **This repo:** Source for published `@viewfly/*` packages and examples (pnpm monorepo). For app work you typically install from npm only—no need to clone.

## Requirements

- **Working inside this repo:** **Node** `^20.19.0 || >=22.12.0`, **pnpm** (see root `package.json` → `packageManager`).
- **In your app:** Match **Vite** / **TypeScript** and the `@viewfly/*` versions you install.

## Using Viewfly in an application

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

**Minimal mount:**

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({ count: 0 })

function App() {
  return () => <div>{model.count}</div>
}

createApp(<App />).mount(document.getElementById('app')!)
```

## Packages (typical order)

| Package | Role |
|---------|------|
| [@viewfly/core](./packages/core/README.en.md) | Core: components, reactivity, `signal`, JSX runtime, lifecycle, `inject`, etc. |
| [@viewfly/platform-browser](./packages/platform-browser/README.en.md) | Browser: `createApp`, mount, destroy. |
| [@viewfly/router](./packages/router/README.en.md) | Routing: `RouterModule`, `Link`, `RouterOutlet`, etc. |
| [@viewfly/devtools](./packages/devtools/README.en.md) | Build: `*.scoped.*` styles with Vite / Rollup / Webpack. |
| [@viewfly/cli](./packages/cli/README.en.md) | CLI scaffolding for Vite + TypeScript. |

Router and scoped CSS are optional. Scoped CSS needs **`@viewfly/core`** (e.g. `withMark`) **and** **`@viewfly/devtools`** — see the devtools README.

*(Chinese README: **[README.md](./README.md)** and each package’s `README.md`.)*

## After cloning (contributing / local runs)

pnpm workspace — install **pnpm**, then:

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
