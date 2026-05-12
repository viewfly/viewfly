# @viewfly/devtools

**Languages:** [English](./README.en.md)

面向 **Viewfly** 的 **构建侧**工具集，本包通过 **`package.json` 的 `exports`** 暴露 **4 条开发侧集成**（不要写死 `dist/...` 深路径）：

| # | 工具 | `exports` 子路径 | 典型场景 |
|---|------|-------------------|----------|
| 1 | **Vite Viewfly HMR** | `@viewfly/devtools/vite-viewfly-hmr-plugin`、`…/vite-viewfly-hmr-plugin/runtime` | Vite **开发服务器**下 Viewfly 组件热更新。 |
| 2 | **Vite 作用域样式** | `@viewfly/devtools/vite-scoped-css-plugin` | Vite 项目里处理 `*.scoped.css` 等，产出 `scopeId`（与 `@viewfly/cli` scoped-css 模板一致）。 |
| 3 | **Rollup 作用域样式** | `@viewfly/devtools/rollup-plugin-scoped-css` | Rollup 打包 scoped 样式。 |
| 4 | **Webpack 作用域样式** | `@viewfly/devtools/scoped-css-webpack-loader` | Webpack `use` 链里处理 scoped 样式。 |

> 作用域样式思路借鉴 Vue scoped CSS，感谢 Vue 生态的开源实践。运行时请在组件上使用 **`@viewfly/core`** 的 **`withMark`** 挂上 **`scopeId`**，见文末「与运行时包的关系」。

---

## 安装

```bash
npm install -D @viewfly/devtools
```

若使用 **Sass / Less / Stylus**，请在业务项目**额外**安装对应预处理器（`sass`、`less`、`stylus` 等），本包不捆绑它们。

---

## 1. Vite Viewfly HMR — `vite-viewfly-hmr-plugin`

**用途：** 仅在 **Vite 开发服务器**（`vite` / `pnpm dev`）下为 Viewfly 函数组件提供 **ESM 级**热更新：导出经 **`wireViewflyHmrModule`** 稳定包装、`import.meta.hot.accept` 按模块刷帧；对带 `__vfHmrKey` 的组件在 **`JSXNodeFactory.createNode`** 外包一层以登记实例；热更时对目标实例 **`destroy` + `markAsDirtied()`**，并同步 **`type` / `atom.nodeType`**，避免只跑旧视图闭包或父文件热更时子树被整段误判重建。

**子路径分工：**

| 子路径 | 运行环境 |
|--------|----------|
| `@viewfly/devtools/vite-viewfly-hmr-plugin` | **Node**：Vite 插件（`transform`、`resolveId`、Babel AST 等）。`@babel/*` 为本包依赖，构建产物中 **external**，由安装本包时一并解析。 |
| `@viewfly/devtools/vite-viewfly-hmr-plugin/runtime` | **浏览器**：`installViewflyHmrCreateNodePatch`、`wireViewflyHmrModule`、`viewflyHmrAcceptSelf` 等，主要依赖 **`@viewfly/core`**。 |

**与生产构建：** 插件使用 **`apply: 'serve'`**，**`vite build` 不会启用**；不注入 bootstrap、不改写业务源码、不把 HMR runtime 打进生产包（勿在生产配置里强行启用 dev 插件）。

**使用：**

```ts
import { defineConfig } from 'vite'
import { viewflyHmrPlugin } from '@viewfly/devtools/vite-viewfly-hmr-plugin'

export default defineConfig({
  plugins: [viewflyHmrPlugin()],
})
```

**peer：** `vite`、`@viewfly/core`（见本包 `package.json`）。

**默认行为摘要：**

- **范围：** 默认只处理项目根下 **`src/**/*.tsx` / `.jsx`**（`include` 可覆盖）。
- **AST（`astRegistry`，默认开启）：** 注入 **`const __vfRegistry = { … }`**、在 **`createApp` 前**插入 **`wireViewflyHmrModule(import.meta.url, __vfRegistry)`**，并把本文件**顶层** PascalCase 组件的 JSX 与路由 **`component:`** 改为经 **`__vfRegistry`** 引用。业务源码中**不要使用**标识符 **`__vfRegistry`**。
- **入口：** 默认在 **`src/main.(m?)tsx?`** 注入 bootstrap 与 `createApp` mount 包装；可用 **`isEntry`** 自定义。
- **关闭 AST：** `viewflyHmrPlugin({ astRegistry: false })`，仅 bootstrap + `hot.accept`。

**取舍（开发态）：** 命中热更的组件会 **`destroy` 后重跑 `setup`**，局部状态会重置；父文件保存触发依赖链 `wire` 时，运行时会尽量稳定 **`wrapped`** 与壳上 **`type` / `nodeType`**，减少子组件误重建。

---

## 2. Vite 作用域样式 — `vite-scoped-css-plugin`

**用途：** 在 **Vite** 里为 `*.scoped.(css|scss|sass|less|styl|stylus)` 等提供编译期作用域与 **`scopeId`** 导出，避免全局样式污染。

在 `pre` 阶段改写脚本里对 `*.scoped.*` 样式的默认导入，并对样式文件本身做与 Rollup/Webpack 侧一致的 `compileStyle` 变换（**`@vue/compiler-sfc`**，与 Vue 3 SFC 一致，支持 **`:deep()`** 等）。选择器会带上形如 **`.foo[data-v-xxxx]`**（与 `id` 对应的 8 位十六进制哈希）的作用域属性。实现与 `scoped-css-core` 对齐，**不依赖** `postcss.config.*`。

**引入：** 默认导出为**插件数组**（`import` 改写 + 样式 transform），必须用展开运算符展开后再放入 `plugins`（与 `@viewfly/cli` 模板里生成 Vite 配置的方式一致）。

```ts
import { defineConfig } from 'vite'
import viteScopedCssPlugin from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...viteScopedCssPlugin()],
})
```

### 文件约定

- 样式路径需匹配：`\.scoped\.(css|scss|sass|less|styl|stylus)$`（与核心常量一致）。
- `scopeId` 由 `createScopeId(绝对路径)` 生成，与 `@viewfly/devtools/rollup-plugin-scoped-css`、Webpack loader 使用同一策略（相对工程根的规范化路径参与哈希）。

### 在组件/脚本里使用 `scopeId`

与 `rewriteScopedStyleImports` 约定一致：对 scoped 样式使用 **默认导入** 得到 **`data-v-` + 8 位哈希** 形式的属性名（与 **`withMark`** 一致），再挂到 DOM 上（空值属性即可命中 **`[data-v-…]`** 选择器）：

```ts
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

构建时上述 `import scopeX from '...scoped...'` 会被改写为侧效导入 + `const scopeX = 'data-v-…'`（与编译产物一致）。

### API

```ts
export default function scopedCssVitePlugin(): Plugin[]
```

### 与 PostCSS 的关系

本插件只负责 **scoped 标记 + 与 Vite 管线衔接**。其余 CSS 处理沿用 Vite 默认行为；若需 PostCSS 插件链，在 `vite.config` 中单独配置即可（勿与 scoped 逻辑混成一条重复链路）。

---

## 3. Rollup 作用域样式 — `rollup-plugin-scoped-css`

**用途：** 在 **Rollup** 管线中把 `*.scoped.(css|scss|sass|less|styl|stylus)` 编译成带作用域标记的 CSS，并在 JS/TS 侧提供稳定的 **`scopeId`**（与 **第 2 节**命名约定一致）。

该实现 **不依赖 PostCSS**（也不依赖 `postcss.config.*`）。若还需要 autoprefixer、cssnano、postcss-modules 等，请把它们作为 **独立的 PostCSS 插件链路** 叠加，而不是把 scoped 逻辑塞进 PostCSS 重复执行。

在业务项目里按需安装预处理器（用到哪个装哪个）：`sass` 或 `node-sass`（`.scss` / `.sass`）、`less`（`.less`）、`stylus`（`.styl` / `.stylus`）。

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

### Rollup 配置提示

在 **`rollup.config.cjs`** 中用 `require('@viewfly/devtools/rollup-plugin-scoped-css')` 引入插件，可避免部分环境下仅解析 ESM 配置时与 devtools 产物的兼容问题。需要内联注入样式时，使用 **`extract: false` + `inject: true`**（见下文「`extract` / `inject`」）。

### 文件约定

- 样式文件必须匹配：`\\.scoped\\.(css|scss|sass|less|styl|stylus)$`。
- `scopeId` 由 `createScopeId(filePath, root)` 生成（与 Vite/Webpack 侧保持一致策略）。

### JS/TS 侧如何拿到 `scopeId`

推荐写法（与 `scoped-css-core/rewrite-imports` 对齐）：

```ts
import scopedId from './app.scoped.scss'

// scopedId: string，例如 `data-v-a1b2c3d4`（供 withMark 使用）
```

插件会在脚本 transform 阶段把 `import scopedId from './app.scoped.scss'` 改写为侧效 `import` + `const scopedId = 'data-v-a1b2c3d4'`（具体值随文件路径哈希而定）。

### `extract` / `inject`

- **`extract: true`**（默认）：在 `generateBundle` 阶段输出聚合 CSS 资产（文件名规则见下方 `extract` 选项说明）。此时样式模块的 JS 产物 **只导出 `default`（scopeId）**，避免把整份 CSS 字符串重复打进 JS。
- **`extract: false`**：把编译后的 CSS 作为字符串模块导出：`export default scopedId`、`export const stylesheet = '...css...'`；若 **`inject: true`**，会追加 `style-inject` 注入逻辑。

### 选项

- **`include` / `exclude`**：传给 `rollup-pluginutils` 的 `createFilter`；默认覆盖常见脚本与样式后缀。
- **`root`**：传给 `createScopeId` 的工程根目录，默认 `process.cwd()`。
- **`sourceMap`**：`false | true | 'inline'`；会传递给 sass/less/stylus loader，并影响 extract 产物的 sourcemap 输出方式。
- **`extract`**：`true` 时输出 `<entryBasename>.css`（当 Rollup `output.file` 不存在时会尽力从 bundle 里找一个 entry 推断 basename）；`string` 时指定输出相对路径（或绝对路径，会转成相对 `output.dir` 的相对路径）。
- **`inject`**：仅在 `extract: false` 时生效；`true` 或 `style-inject` 的 options 对象。
- **`use`**：预处理器参数：`use.sass`、`use.less`、`use.stylus`。

### 与 PostCSS 的关系

本插件只做 **scoped + 预处理器**。若还需要 autoprefixer、cssnano、postcss-modules 等，请在构建里单独接一条 PostCSS / `rollup-plugin-postcss` 等链路，不要与本插件混在同一套 PostCSS 管道里重复做 scoped。

---

## 4. Webpack 作用域样式 — `scoped-css-webpack-loader`

**用途：** 在 **Webpack** 的 **`use`** 链中，对匹配 `*.scoped.(css|scss|sass|less|styl|stylus)` 的资源先做与 Vite/Rollup 相同的 **scoped 编译**（`transformScopedStyle`），再交给 **`css-loader`**；非 scoped 文件则 **直接透传** 给 `css-loader`，因此可在同一条 `use` 链上替代原先的 `css-loader` 位置（仍需在其前配置 `style-loader` / `MiniCssExtractPlugin.loader` 等）。命名与 `scopeId` 策略与 **第 2 节**一致。

```bash
npm install @viewfly/devtools css-loader style-loader -D
```

预处理器（sass / less / stylus）若需单独处理，请在更上游增加对应 loader；本 loader 只处理已进入 CSS 文本且路径符合 scoped 约定的文件。

典型链：**`style-loader`** → **本 loader**（内部会 `css-loader.apply`）。

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

若需同时匹配 `scss`，可将 `test` 改为 `/\.s?css$/` 并自行在链上加入 `sass-loader` 等，保证进入本 loader 的已是 CSS 字符串且 `resource` 仍为 `*.scoped.*` 路径。

### 文件约定

- 仅当 `resource` 匹配 `isScopedStyleFile`（即 `*.scoped.(css|scss|sass|less|styl|stylus)`）时走 scoped 分支。
- `scopeId` 使用 `createScopeId(resource, rootContext || process.cwd())`，与 Vite、Rollup 插件一致。

### 在应用代码里使用 `scopeId`

对 scoped 样式模块使用默认导入；在 **css-loader** 产物上本 loader 会补丁写入 `locals` 为 **`data-v-` + 哈希** 字符串，故 ESM 下 `import scope from './x.scoped.css'` 的 `default` 与 **`withMark`** 所需一致：

```js
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

### 实现说明

- Scoped 分支：`transformScopedStyle` → `cssLoader.apply(this, [code, map])`。
- 非 scoped：`cssLoader.apply(this, [source, map, meta])`，行为与仅使用 `css-loader` 一致。

---

## 作用域样式（第 2、3、4 节共通）

三工具的 **`*.scoped.*` 命名**与 **`scopeId` 生成策略**一致；各集成在脚本侧如何默认导入 `scopeId`、以及 Vite/Rollup/Webpack 特有选项，见上文对应小节。

### PostCSS

上述 **scoped 管线**不负责替你配置 autoprefixer 等；请在 **Vite / PostCSS / Webpack** 的常规配置里单独增加，与 scoped 工具并行即可。

---

## 与运行时包的关系

构建产物里的选择器会带类似 **`[data-v-a1b2c3d4]`** 的作用域属性。在 Viewfly 组件根节点打上默认导入得到的属性名（**`withMark(scopeId)`**）才能命中样式，推荐 **`@viewfly/core`** 的 **`withMark`**（参数与示例见 core 包 README 与类型定义）。

---

## 其它文档

- 官网：<https://viewfly.org>（作用域样式等章节）。

---

## License

MIT
