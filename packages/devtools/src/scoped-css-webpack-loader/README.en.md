# `@viewfly/devtools/scoped-css-webpack-loader`

**Languages:** [简体中文](./README.md)

Webpack loader: for resources matching `*.scoped.(css|scss|sass|less|styl|stylus)`, run the same **scoped compile** as Vite/Rollup (`transformScopedStyle`), then delegate to **`css-loader`**. Non-scoped files **pass through** to `css-loader`, so this loader can replace `css-loader` in the same `use` chain (still put `style-loader` / `MiniCssExtractPlugin.loader` upstream as usual).

## Install

```bash
npm install @viewfly/devtools css-loader style-loader -D
```

Add sass/less/stylus loaders further upstream if needed; this loader expects CSS text for scoped paths only.

## Usage

Typical chain: **`style-loader`** → **this loader** (internally calls `css-loader.apply`).

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

For `scss`, widen `test` to `/\.s?css$/` and insert `sass-loader` etc., ensuring the resource path still ends with `*.scoped.*`.

## File naming

- Scoped branch only when `resource` matches `isScopedStyleFile` (`*.scoped.(css|scss|sass|less|styl|stylus)`).
- `scopeId` via `createScopeId(resource, rootContext || process.cwd())`, aligned with Vite/Rollup.

## Using `scopeId` in app code

Default-import scoped modules. On the css-loader output this loader patches `locals` so ESM `import scope from './x.scoped.css'` yields `vf-xxxxxx` as default:

```js
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

## Implementation notes

- Scoped path: `transformScopedStyle` → `cssLoader.apply(this, [code, map])`.
- Non-scoped: `cssLoader.apply(this, [source, map, meta])` — same as plain `css-loader`.

## Docs

- Official site: <https://viewfly.org> (scoped styles).
