# @viewfly/devtools

**Languages:** [简体中文](./README.md)

Build-time tooling for the **Viewfly** stack. Typical use: compile `*.scoped.(css|scss|sass|less|styl|stylus)` with a stable **`scopeId`** export so you can mark the DOM and avoid global style bleed (runtime: **`withMark`** from **`@viewfly/core`**).

> Approach inspired by Vue scoped CSS — thanks to the Vue ecosystem.

---

## Install

```bash
npm install -D @viewfly/devtools
```

If you use **Sass / Less / Stylus**, install the matching preprocessor in **your** app (`sass`, `less`, `stylus`, …). This package does not bundle them.

---

## Pick an integration

Import from **`package.json` `exports`** subpaths (avoid deep `dist/...` imports).

| Subpath | Use case |
|---------|----------|
| `@viewfly/devtools/vite-scoped-css-plugin` | **Vite** (matches `@viewfly/cli` “scoped-css” template). |
| `@viewfly/devtools/rollup-plugin-scoped-css` | **Rollup**. |
| `@viewfly/devtools/scoped-css-webpack-loader` | **Webpack** — swap into your `use` chain for scoped assets. |

### Vite (common)

```ts
import { defineConfig } from 'vite'
import viteScopedCssPlugin from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...viteScopedCssPlugin()]
})
```

The default export is a **plugin array** — spread it into `plugins`.

### File naming

Paths must look like **`something.scoped.css`** (plus `.scss`, `.less`, `.styl`, …). Details and default-import → `scopeId` conventions:

- [vite-scoped-css-plugin](./src/vite-scoped-css-plugin/README.md) · [EN](./src/vite-scoped-css-plugin/README.en.md)
- [rollup-plugin-scoped-css](./src/rollup-plugin-scoped-css/README.md) · [EN](./src/rollup-plugin-scoped-css/README.en.md)
- [scoped-css-webpack-loader](./src/scoped-css-webpack-loader/README.md) · [EN](./src/scoped-css-webpack-loader/README.en.md)

### PostCSS

These tools **do not** configure autoprefixer for you. Add PostCSS in standard Vite / Webpack / PostCSS config alongside the scoped pipeline.

---

## Relationship to runtime packages

Compiled selectors carry attributes like **`[vf-xxxxxx]`**. Apply the matching **`scopeId`** on nodes—recommended API: **`withMark`** from **`@viewfly/core`** (see core README and typings).

---

## Docs

- Official site: <https://viewfly.org> (scoped styles).
- Per-integration READMEs linked above (ZH + EN).

---

## License

MIT
