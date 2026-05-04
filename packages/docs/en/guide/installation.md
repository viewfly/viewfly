# Installation

This page does one thing: install Viewfly-related packages and wire up the compiler once. Commands below use **npm**; swap in `yarn`, `pnpm`, or your package manager as needed.

## Prerequisites

Make sure your **Node.js** version matches what your build tool expects (for Vite, this repo commonly targets `^20.19` or `>=22.12`), and install **TypeScript** aligned with your project when you use **TSX**.

## Core packages

```bash
npm install @viewfly/core @viewfly/platform-browser
```

Add routing or devtools only if you need them:

```bash
npm install @viewfly/router
npm install -D @viewfly/devtools
```

See [npm packages overview](./packages.md) for what each package does.

## TypeScript (required for JSX)

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

Tune `target`, `module`, and other flags for your toolchain—the two options above must stay correct.

## Dependency injection (decorators)

If you use decorators such as `@Injectable()`, finish the three steps below.

### 1) `tsconfig.json`

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 2) Load metadata at the entry

Importing from `@viewfly/core`’s main entry is usually enough. If injection still misbehaves at runtime, add at the very top of your entry:

```ts
import 'reflect-metadata'
```

### 3) Vite pipeline (emit decorator metadata)

**Option A: Vite + SWC**

```bash
npm install -D vite-plugin-swc-transform
```

```ts
import { defineConfig, type Plugin } from 'vite'
import swc from 'vite-plugin-swc-transform'

export default defineConfig({
  plugins: [
    swc({
      swcOptions: {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
            tsx: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
        },
      },
    }) as Plugin,
  ],
})
```

**Option B: Vite + Babel**

```bash
npm install -D @babel/core @babel/plugin-proposal-decorators babel-plugin-transform-typescript-metadata vite-plugin-babel
```

```ts
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          'babel-plugin-transform-typescript-metadata',
        ],
      },
    }),
  ],
})
```

## Next steps

- [Quick start](./quick-start.md) — get something running fast
- [Creating an application](./essentials-application.md) — app entry and lifecycle
- [CLI & tooling](./cli.md)
