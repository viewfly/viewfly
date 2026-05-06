# 作用域样式

`@viewfly/devtools` 提供构建侧工具集，用于处理 `*.scoped.css`（以及 `.scss`、`.less`、`.styl` 等）并产出作用域选择器与 `scopeId`。运行时可结合 `@viewfly/core` 的 `withMark` 打标，避免全局样式污染。

同一包在 **`Vite` 开发服务器**下还提供 **Viewfly 组件热更新（HMR）** 能力，与作用域样式彼此独立；使用官方脚手架时通常会一并配置。本文只讲 scoped 样式，HMR 的接入与注意点见 **[@viewfly/devtools](https://www.npmjs.com/package/@viewfly/devtools)** 与 [脚手架与工具链](../cli.md)。

## 安装

```bash
npm install -D @viewfly/devtools
```

若使用 `Sass` / `Less` / `Stylus`，请在项目中自行安装对应预处理器（如 `sass`、`less`、`stylus`），本包不会代为安装。

## Vite（常用）

```ts
import { defineConfig } from 'vite'
import viteScopedCssPlugin from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...viteScopedCssPlugin()],
})
```

默认导出是插件数组，需要展开后放入 `plugins`。

## 其他构建工具

从包的 `exports` 子路径按场景引入（不要依赖 `dist/...` 深路径）：

- `@viewfly/devtools/vite-scoped-css-plugin`：Vite
- `@viewfly/devtools/rollup-plugin-scoped-css`：Rollup
- `@viewfly/devtools/scoped-css-webpack-loader`：Webpack

各子路径的详细用法见 npm 包内 README。

## 与组件的协作

作用域样式要生效，需要构建期与运行期配合：

1. 构建期：`@viewfly/devtools` 处理 scoped 样式并产出标识；
2. 运行期：组件用 `withMark` 打上对应标记；
3. 命中后：样式限制在目标组件域内。

组件侧打标可直接使用 `withMark(marks, setup)`。

## 使用示例

下面给一个最小可运行思路：样式文件声明 `.scoped.css`，组件里拿到 `scopeId`，再用 `withMark` 打标。

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
      <h2 class="title">订单页</h2>
    </section>
  )
})
```

如果 `scopeId` 对应标记与构建产物一致，样式只会命中这次组件渲染创建的节点域。

## PostCSS

`@viewfly/devtools` 不负责配置 `autoprefixer` 等 `PostCSS` 插件；若需要，请在 `Vite` / `PostCSS` / `Webpack` 常规配置中单独增加，与 scoped 管线并行即可。

## 下一步

- [依赖注入](../dependency-injection.md)
- [脚手架与工具链](../cli.md)
