# `@viewfly/devtools/rollup-plugin-scoped-css`

**Languages:** [简体中文](./README.md)

Rollup **scoped CSS** plugin: compiles `*.scoped.(css|scss|sass|less|styl|stylus)` with scoped markers and exposes a stable **`scopeId`** to JS/TS.

**Does not** depend on PostCSS or `postcss.config.*`. For autoprefixer, cssnano, postcss-modules, etc., add a **separate** PostCSS pipeline—don’t fold scoped logic into PostCSS twice.

## Install

Install preprocessors you actually use:

- `sass` or `node-sass`: `.scss` / `.sass`
- `less`: `.less`
- `stylus`: `.styl` / `.stylus`

## Usage

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

## Rollup tips

In **`rollup.config.cjs`**, `require('@viewfly/devtools/rollup-plugin-scoped-css')` avoids some ESM-only resolution issues. For inlined CSS use **`extract: false` + `inject: true`** (see **extract / inject** below).

## File naming

- Files must match `\\.scoped\\.(css|scss|sass|less|styl|stylus)$`
- `scopeId` from `createScopeId(filePath, root)` (same strategy as Vite/Webpack)

## Getting `scopeId` from JS/TS

Recommended (aligned with `scoped-css-core/rewrite-imports`):

```ts
import scopedId from './app.scoped.scss'

// scopedId: string, e.g. `vf-xxxxxx`
```

During script transform the plugin rewrites:

```ts
import scopedId from './app.scoped.scss'
```

to:

```ts
import './app.scoped.scss'
const scopedId = 'vf-xxxxxx'
```

## `extract` / `inject`

- **`extract: true`** (default): emit aggregated CSS assets in `generateBundle`. JS modules **only default-export `scopeId`** so CSS isn’t duplicated as giant strings in JS.
- **`extract: false`**: emit compiled CSS as a string module:
  - `export default scopedId`
  - `export const stylesheet = '...css...'`
  - with **`inject: true`**, append `style-inject` logic

## Options

- **`include` / `exclude`**: `createFilter` from `rollup-pluginutils`; defaults cover common script/style extensions.
- **`root`**: project root for `createScopeId`, default `process.cwd()`.
- **`sourceMap`**: `false | true | 'inline'` — forwarded to sass/less/stylus loaders and affects extract sourcemaps.
- **`extract`**:
  - `true`: emit `<entryBasename>.css` (infers basename from bundle entries when `output.file` is absent)
  - `string`: explicit relative or absolute path (normalized vs `output.dir`)
- **`inject`**: only when `extract: false`; `true` or options for `style-inject`.
- **`use`**: preprocessor options — `use.sass`, `use.less`, `use.stylus`

## PostCSS

This plugin handles **scoped + preprocessors** only. For autoprefixer, cssnano, postcss-modules, wire a **separate** PostCSS / `rollup-plugin-postcss` pipeline—don’t merge scoped work into the same PostCSS pipe twice.

## Docs

- Official site: <https://viewfly.org> (scoped styles).
