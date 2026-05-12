# @viewfly/devtools

**Languages:** [简体中文](./README.md)

**Build-time** integrations for **Viewfly**. This package exposes **four** entry points via **`package.json` `exports`** (avoid deep `dist/...` imports):

| # | Tool | `exports` subpath | Typical use |
|---|------|-------------------|---------------|
| 1 | **Vite Viewfly HMR** | `@viewfly/devtools/vite-viewfly-hmr-plugin`, `…/vite-viewfly-hmr-plugin/runtime` | **Vite dev server** Viewfly component HMR. |
| 2 | **Vite scoped CSS** | `@viewfly/devtools/vite-scoped-css-plugin` | Vite: `*.scoped.css` (etc.) → `scopeId` (same idea as `@viewfly/cli` scoped-css template). |
| 3 | **Rollup scoped CSS** | `@viewfly/devtools/rollup-plugin-scoped-css` | Rollup pipeline for scoped styles. |
| 4 | **Webpack scoped CSS** | `@viewfly/devtools/scoped-css-webpack-loader` | Webpack `use` chain for scoped styles. |

> Scoped CSS approach inspired by Vue — thanks to the Vue ecosystem. At runtime use **`withMark`** from **`@viewfly/core`** with the **`scopeId`** (see “Relationship to runtime packages” below).

---

## Install

```bash
npm install -D @viewfly/devtools
```

If you use **Sass / Less / Stylus**, install the matching preprocessor in **your** app (`sass`, `less`, `stylus`, …). This package does not bundle them.

---

## 1. Vite Viewfly HMR — `vite-viewfly-hmr-plugin`

**What it does:** Under the **Vite dev server** only, ESM-friendly HMR for Viewfly function components: **`wireViewflyHmrModule`** stable export shells, **`import.meta.hot.accept`** per module flush; **`JSXNodeFactory.createNode`** wrap for `__vfHmrKey` types to register instances; on update **`destroy` + `markAsDirtied()`** and sync **`type` / `atom.nodeType`** so old view closures aren’t reused and parent saves don’t blindly rebuild child subtrees.

**Subpaths:**

| Subpath | Runs in |
|---------|---------|
| `@viewfly/devtools/vite-viewfly-hmr-plugin` | **Node** — Vite plugin (`transform`, `resolveId`, Babel AST, …). **`@babel/*`** are this package’s **dependencies** and stay **external** in the built plugin. |
| `@viewfly/devtools/vite-viewfly-hmr-plugin/runtime` | **Browser** — `installViewflyHmrCreateNodePatch`, `wireViewflyHmrModule`, `viewflyHmrAcceptSelf`, … mainly **`@viewfly/core`**. |

**Production:** **`apply: 'serve'`** — **`vite build` does not load this plugin**; no bootstrap injection, no source transforms, no HMR runtime in prod (don’t force dev-only plugins in prod config).

**Usage:**

```ts
import { defineConfig } from 'vite'
import { viewflyHmrPlugin } from '@viewfly/devtools/vite-viewfly-hmr-plugin'

export default defineConfig({
  plugins: [viewflyHmrPlugin()],
})
```

**Peers:** `vite`, `@viewfly/core` (see this package’s `package.json`).

**Defaults:**

- **Scope:** **`src/**/*.tsx`/`.jsx`** by default (`include` to override).
- **AST (`astRegistry`, on):** injects **`const __vfRegistry = { … }`**, **`wireViewflyHmrModule(import.meta.url, __vfRegistry)`** before **`createApp`**, rewrites top-level PascalCase JSX and route **`component:`** to **`__vfRegistry`**. Do **not** use the identifier **`__vfRegistry`** in your own source.
- **Entry:** default **`src/main.(m?)tsx?`** for bootstrap + `createApp` mount wrap; override with **`isEntry`**.
- **Disable AST:** `viewflyHmrPlugin({ astRegistry: false })` — bootstrap + `hot.accept` only.

**Trade-offs (dev):** hot updates **`destroy` then re-run `setup`** (local state resets). When parent saves re-run **`wire`** on dependents, the runtime keeps **`wrapped`** and shell **`type` / `nodeType`** aligned to reduce accidental child rebuilds.

---

## 2. Vite scoped CSS — `vite-scoped-css-plugin`

**What it does:** In **Vite**, compile `*.scoped.(css|scss|sass|less|styl|stylus)` with a stable **`scopeId`** export to avoid global style bleed.

In **`pre`**, rewrite default imports of `*.scoped.*` styles in scripts, and transform style files with the same **`compileStyle`** pipeline as Rollup/Webpack (**`@vue/compiler-sfc`**, same as Vue 3 SFC scoped styles, including **`:deep()`**). Selectors gain qualifiers like **`.foo[data-v-xxxx]`** (8 hex chars from the stable per-file hash). Aligned with **`scoped-css-core`**; **does not** depend on **`postcss.config.*`**.

**Import:** default export is a **plugin array** (import rewrite + style transform). Spread into **`plugins`** (same pattern as the CLI template’s generated Vite config).

```ts
import { defineConfig } from 'vite'
import viteScopedCssPlugin from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...viteScopedCssPlugin()],
})
```

### File naming

- Paths must match **`\.scoped\.(css|scss|sass|less|styl|stylus)$`** (core constant).
- **`scopeId`** comes from **`createScopeId(absolutePath)`** — same strategy as Rollup/Webpack (normalized path from project root feeds the hash).

### Using `scopeId` from components/scripts

Per **`rewriteScopedStyleImports`**: **default-import** scoped sheets as **`data-v-`** plus an 8-char hex hash (for **`withMark`**), then set on the DOM (empty attribute value still matches **`[data-v-…]`** selectors):

```ts
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

At build time **`import scopeX from '...scoped...'`** becomes a side-effect import plus **`const scopeX = 'data-v-…'`** (matches compiled selectors).

### API

```ts
export default function scopedCssVitePlugin(): Plugin[]
```

### PostCSS (Vite plugin)

This plugin only handles **scoped marking + Vite wiring**. Other CSS processing follows Vite defaults; add PostCSS plugins in **`vite.config`** separately — don’t duplicate scoped work in another pass.

---

## 3. Rollup scoped CSS — `rollup-plugin-scoped-css`

**What it does:** **Rollup** pipeline for the same **`*.scoped.*`** naming as **section 2**: compiles scoped styles and exposes a stable **`scopeId`** to JS/TS.

**Does not** depend on PostCSS or **`postcss.config.*`**. For autoprefixer, cssnano, postcss-modules, etc., add a **separate** PostCSS pipeline — don’t fold scoped logic into PostCSS twice.

Install preprocessors you actually use: **`sass`** or **`node-sass`** (`.scss` / `.sass`), **`less`**, **`stylus`**.

```ts
import scopedCss from '@viewfly/devtools/rollup-plugin-scoped-css'

export default {
  plugins: [
    scopedCss({
      extract: true,
      sourceMap: true,
      use: {
        sass: {},
        less: {},
        stylus: {}
      }
    })
  ]
}
```

### Rollup tips

In **`rollup.config.cjs`**, **`require('@viewfly/devtools/rollup-plugin-scoped-css')`** avoids some ESM-only resolution issues. For inlined CSS use **`extract: false` + `inject: true`** (see **extract / inject** below).

### File naming

- Files must match **`\\.scoped\\.(css|scss|sass|less|styl|stylus)$`**.
- **`scopeId`** from **`createScopeId(filePath, root)`** (same strategy as Vite/Webpack).

### Getting `scopeId` from JS/TS

Recommended (aligned with **`scoped-css-core/rewrite-imports`**):

```ts
import scopedId from './app.scoped.scss'

// scopedId: string, e.g. `data-v-a1b2c3d4` (for withMark)
```

During script transform the plugin rewrites **`import scopedId from './app.scoped.scss'`** to a side-effect **`import`** plus **`const scopedId = 'data-v-a1b2c3d4'`** (actual value is path-derived).

### `extract` / `inject`

- **`extract: true`** (default): emit aggregated CSS assets in **`generateBundle`**. JS modules **only default-export `scopeId`** so CSS isn’t duplicated as giant strings in JS.
- **`extract: false`**: emit compiled CSS as a string module: **`export default scopedId`**, **`export const stylesheet = '...css...'`**; with **`inject: true`**, append **`style-inject`** logic.

### Options

- **`include` / `exclude`**: **`createFilter`** from **`rollup-pluginutils`**; defaults cover common script/style extensions.
- **`root`**: project root for **`createScopeId`**, default **`process.cwd()`**.
- **`sourceMap`**: **`false | true | 'inline'`** — forwarded to sass/less/stylus loaders and affects extract sourcemaps.
- **`extract`**: **`true`** emits **`<entryBasename>.css`** (infers basename from bundle entries when **`output.file`** is absent); **`string`** is an explicit relative or absolute path (normalized vs **`output.dir`**).
- **`inject`**: only when **`extract: false`**; **`true`** or options for **`style-inject`**.
- **`use`**: preprocessor options — **`use.sass`**, **`use.less`**, **`use.stylus`**.

### PostCSS (Rollup plugin)

This plugin handles **scoped + preprocessors** only. For autoprefixer, cssnano, postcss-modules, wire a **separate** PostCSS / **`rollup-plugin-postcss`** pipeline — don’t merge scoped work into the same PostCSS pipe twice.

---

## 4. Webpack scoped CSS — `scoped-css-webpack-loader`

**What it does:** **Webpack** **`use`** chain: for resources matching **`*.scoped.(css|scss|sass|less|styl|stylus)`**, run the same **scoped compile** as Vite/Rollup (**`transformScopedStyle`**), then delegate to **`css-loader`**. Non-scoped files **pass through** to **`css-loader`**, so this loader can replace **`css-loader`** in the same chain (still put **`style-loader`** / **`MiniCssExtractPlugin.loader`** upstream). Same naming as **section 2**.

```bash
npm install @viewfly/devtools css-loader style-loader -D
```

Add sass/less/stylus loaders further upstream if needed; this loader expects CSS text for scoped paths only.

Typical chain: **`style-loader`** → **this loader** (internally calls **`css-loader.apply`**).

```js
// webpack.config.cjs
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          require.resolve('@viewfly/devtools/scoped-css-webpack-loader')
        ]
      }
    ]
  }
}
```

For **`scss`**, widen **`test`** to **`/\.s?css$/`** and insert **`sass-loader`** etc., ensuring the resource path still ends with **`*.scoped.*`**.

### File naming

- Scoped branch only when **`resource`** matches **`isScopedStyleFile`** (**`*.scoped.(css|scss|sass|less|styl|stylus)`**).
- **`scopeId`** via **`createScopeId(resource, rootContext || process.cwd())`**, aligned with Vite/Rollup.

### Using `scopeId` in app code

Default-import scoped modules. On the css-loader output this loader patches **`locals`** so ESM **`import scope from './x.scoped.css'`** yields **`data-v-`** + hash as default (same string **`withMark`** needs):

```js
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

### Implementation notes

- Scoped path: **`transformScopedStyle`** → **`cssLoader.apply(this, [code, map])`**.
- Non-scoped: **`cssLoader.apply(this, [source, map, meta])`** — same as plain **`css-loader`**.

---

## Scoped CSS shared (sections 2, 3, 4)

**`*.scoped.*` naming** and **`scopeId` generation** are aligned across all three; default-import **`scopeId`** and integration-specific options are in the sections above.

### PostCSS

These tools **do not** configure autoprefixer for you. Add PostCSS in standard Vite / Webpack / PostCSS config alongside the scoped pipeline.

---

## Relationship to runtime packages

Compiled selectors carry attributes like **`[data-v-a1b2c3d4]`**. Apply the default-imported attribute name with **`withMark`** from **`@viewfly/core`** (see core README and typings).

---

## More docs

- Site: <https://viewfly.org> (scoped styles, etc.).

---

## License

MIT
