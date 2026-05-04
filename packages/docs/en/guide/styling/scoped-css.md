# Scoped CSS

`@viewfly/devtools` ships build-time tooling for `*.scoped.css` (and `.scss`, `.less`, `.styl`, etc.), emitting scoped selectors and a `scopeId`. At runtime, pair it with `withMark` from `@viewfly/core` so styles do not leak globally.

## Install

```bash
npm install -D @viewfly/devtools
```

If you use **Sass**, **Less**, or **Stylus**, install the matching preprocessor in your app (`sass`, `less`, `stylus`, …). This package does not bundle them.

## Vite (common)

```ts
import { defineConfig } from 'vite'
import viteScopedCssPlugin from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...viteScopedCssPlugin()],
})
```

The default export is a **plugin array**—spread it into `plugins`.

## Other bundlers

Import from package **`exports`** subpaths (avoid deep `dist/...` imports):

- `@viewfly/devtools/vite-scoped-css-plugin` — Vite
- `@viewfly/devtools/rollup-plugin-scoped-css` — Rollup
- `@viewfly/devtools/scoped-css-webpack-loader` — Webpack

See each package’s README on npm for details.

## Working with components

Scoped styles need build + runtime cooperation:

1. **Build**: `@viewfly/devtools` processes scoped CSS and emits identifiers.
2. **Runtime**: components call `withMark` with the matching mark.
3. **Result**: selectors apply only inside that component’s subtree.

Use **`withMark(marks, setup)`** on the component side.

## Example

Minimal flow: a `*.scoped.css` file, import its `scopeId`, wrap the component with `withMark`.

```css
/* order-page.scoped.css */
.root {
  padding: 12px;
  border: 1px solid #e5e7eb;
}

.title {
  font-weight: 600;
}
```

```tsx
import { withMark } from '@viewfly/core'
import scopeId from './order-page.scoped.css'

export const OrderPage = withMark(scopeId, function OrderPage() {
  return () => (
    <section class="root">
      <h2 class="title">Orders</h2>
    </section>
  )
})
```

When the `scopeId` mark matches the build output, styles only hit DOM created under this component render.

## PostCSS

`@viewfly/devtools` does **not** configure `autoprefixer` or other PostCSS plugins. Add them in your usual Vite / PostCSS / Webpack config alongside the scoped pipeline.

## Next steps

- [Dependency injection](../dependency-injection.md)
- [CLI & tooling](../cli.md)
