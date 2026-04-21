# `@viewfly/devtools/vite-scoped-css-plugin`

面向 Vite 的 **scoped css** 插件组：在 `pre` 阶段改写脚本里对 `*.scoped.*` 样式的默认导入，并对样式文件本身做与 Rollup/Webpack 侧一致的 `compileStyle` 变换，使选择器带上与 `scopeId` 对应的属性选择器（形如 `.foo[vf-xxxxxx]`）。

实现与 `scoped-css-core` 对齐，**不依赖** `postcss.config.*`。需要 autoprefixer 等能力时，请用 Vite 自带的 PostCSS 配置单独处理，勿与 scoped 逻辑混成一条重复链路。

## 安装

```bash
npm install @viewfly/devtools -D
```

## 使用

```ts
import { defineConfig } from 'vite'
import scopedCss from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...scopedCss()]
})
```

默认导出为 **插件数组**（`import` 改写 + 样式 transform），必须用展开运算符展开后再放入 `plugins`（与 CLI 模板 `packages/cli/src/run.ts` 里 `buildViteConfigSource` 生成方式一致）。

## 文件约定

- 样式路径需匹配：`\.scoped\.(css|scss|sass|less|styl|stylus)$`（与核心常量一致）。
- `scopeId` 由 `createScopeId(绝对路径)` 生成，与 `@viewfly/devtools/rollup-plugin-scoped-css`、Webpack loader 使用同一策略（相对工程根的规范化路径参与哈希）。

## 在组件/脚本里使用 `scopeId`

与 `rewriteScopedStyleImports` 约定一致：对 scoped 样式使用 **默认导入** 得到字符串 `scopeId`，再挂到 DOM 上（空值属性即可命中 `[vf-…]` 选择器）：

```ts
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

构建时上述 `import scopeX from '...scoped...'` 会被改写为侧效导入 + `const scopeX = 'vf-…'`。

## API

```ts
export default function scopedCssVitePlugin(): Plugin[]
```

## 与 PostCSS 的关系

本插件只负责 **scoped 标记 + 与 Vite 管线衔接**。其余 CSS 处理沿用 Vite 默认行为；若需 PostCSS 插件链，在 `vite.config` 中单独配置即可。
