# `@viewfly/devtools/rollup-plugin-scoped-css`

面向 Rollup 的 **scoped css** 插件：把 `*.scoped.(css|scss|sass|less|styl|stylus)` 编译成带作用域标记的 CSS，并在 JS/TS 侧提供稳定的 `scopeId`。

该实现 **不依赖 PostCSS**（也不依赖 `postcss.config.*`）。如果你还需要 autoprefixer、cssnano、postcss-modules 等能力，请把它们作为 **独立的 PostCSS 插件链路** 叠加，而不是把 scoped 逻辑塞进 PostCSS。

## 安装

在业务项目里按需安装预处理器（用到哪个装哪个）：

- `sass` 或 `node-sass`：处理 `.scss/.sass`
- `less`：处理 `.less`
- `stylus`：处理 `.styl/.stylus`

## 使用

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

## 文件约定

- 样式文件必须匹配：`\\.scoped\\.(css|scss|sass|less|styl|stylus)$`
- `scopeId` 由 `createScopeId(filePath, root)` 生成（与 Vite/Webpack 侧保持一致策略）

## JS/TS 侧如何拿到 `scopeId`

推荐写法（与 `scoped-css-core/rewrite-imports` 对齐）：

```ts
import scopedId from './app.scoped.scss'

// scopedId: string，例如 `vf-xxxxxx`
```

插件会在脚本 transform 阶段把：

```ts
import scopedId from './app.scoped.scss'
```

改写为：

```ts
import './app.scoped.scss'
const scopedId = 'vf-xxxxxx'
```

## `extract` / `inject`

- `extract: true`（默认）：在 `generateBundle` 阶段输出聚合 CSS 资产（文件名规则见下方 `extract` 选项说明）。此时样式模块的 JS 产物 **只导出 `default`（scopeId）**，避免把整份 CSS 字符串重复打进 JS。
- `extract: false`：把编译后的 CSS 作为字符串模块导出：

  - `export default scopedId`
  - `export const stylesheet = '...css...'`
  - 若 `inject: true`，会追加 `style-inject` 注入逻辑

## 选项

- `include` / `exclude`：传给 `rollup-pluginutils` 的 `createFilter`；默认覆盖常见脚本与样式后缀。
- `root`：传给 `createScopeId` 的工程根目录，默认 `process.cwd()`。
- `sourceMap`：`false | true | 'inline'`；会传递给 sass/less/stylus loader，并影响 extract 产物的 sourcemap 输出方式。
- `extract`：
  - `true`：输出 `<entryBasename>.css`（当 Rollup `output.file` 不存在时会尽力从 bundle 里找一个 entry 推断 basename）
  - `string`：指定输出相对路径（或绝对路径，会转成相对 `output.dir` 的相对路径）
- `inject`：仅在 `extract: false` 时生效；`true` 或 `style-inject` 的 options 对象。
- `use`：预处理器参数：
  - `use.sass`
  - `use.less`
  - `use.stylus`

## 与旧 `rollup-plugin-postcss` 的关系

历史原因：`packages/devtools/src/rollup-plugin-postcss` 是 fork 后的实现，其中 scoped 逻辑通过 PostCSS 插件 `scoped-css-plugin` 注入。

如果你只需要 **scoped css +（可选）sass/less/stylus**，优先使用本插件：

- scoped：`@vue/component-compiler-utils` 的 `compileStyle`（与 `scoped-css-core/transform-scoped-style` 对齐）
- 预处理器：复用现有 `sass-loader` / `less-loader` / `stylus-loader`

仍需要 PostCSS 生态时：保留 `rollup-plugin-postcss`，但不要把 scoped 继续往 PostCSS 里堆。
