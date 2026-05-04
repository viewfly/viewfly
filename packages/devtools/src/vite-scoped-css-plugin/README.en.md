# `@viewfly/devtools/vite-scoped-css-plugin`

**Languages:** [简体中文](./README.md)

Vite **scoped CSS** plugin pack: in `pre`, rewrite default imports of `*.scoped.*` styles in scripts, and transform style files with the same `compileStyle` pipeline as Rollup/Webpack so selectors gain attribute qualifiers like `.foo[vf-xxxxxx]`.

Aligned with `scoped-css-core`; **does not** depend on `postcss.config.*`. For autoprefixer etc., use Vite’s PostCSS settings separately—don’t duplicate scoped work in another pass.

## Install

```bash
npm install @viewfly/devtools -D
```

## Usage

```ts
import { defineConfig } from 'vite'
import scopedCss from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...scopedCss()]
})
```

Default export is a **plugin array** (import rewrite + style transform). Spread into `plugins` (same pattern as CLI template `buildViteConfigSource` in `packages/cli/src/run.ts`).

## File naming

- Paths must match `\.scoped\.(css|scss|sass|less|styl|stylus)$` (core constant).
- `scopeId` comes from `createScopeId(absolutePath)` — same strategy as Rollup/Webpack (normalized path from project root feeds the hash).

## Using `scopeId` from components/scripts

Per `rewriteScopedStyleImports`: **default-import** scoped sheets as string `scopeId`, then set on the DOM (empty attribute value still matches `[vf-…]` selectors):

```ts
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

At build time `import scopeX from '...scoped...'` becomes a side-effect import plus `const scopeX = 'vf-…'`.

## API

```ts
export default function scopedCssVitePlugin(): Plugin[]
```

## PostCSS

This plugin only handles **scoped marking + Vite wiring**. Other CSS processing follows Vite defaults; add PostCSS plugins in `vite.config` separately.

## Docs

- Official site: <https://viewfly.org> (scoped styles).
