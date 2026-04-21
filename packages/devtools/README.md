# @viewfly/devtools

面向 **Viewfly 技术栈**的构建侧工具集，典型场景是为 `*.scoped.(css|scss|sass|less|styl|stylus)` 等文件提供与 [官网 Scoped CSS 流程](https://viewfly.org/guide/scoped-css) 一致的编译与 **`scopeId`** 导出，便于你在 DOM 上挂属性、避免全局样式污染。

> 思路借鉴 Vue scoped CSS，感谢 Vue 生态的开源实践。

---

## 安装

```bash
pnpm add -D @viewfly/devtools
```

若使用 **Sass / Less / Stylus**，请在你的业务项目中**额外**安装对应预处理器（如 `sass`、`less`、`stylus`），本包不会替你安装它们。

---

## 按构建工具选择入口

安装后从 **`package.json` 的 `exports`** 子路径按需引入（不要依赖深路径 `dist/...`）。

| 子路径 | 适用场景 |
|--------|----------|
| `@viewfly/devtools/vite-scoped-css-plugin` | **Vite** 项目（推荐与 `@viewfly/cli` 勾选 scoped-css 生成的配置一致）。 |
| `@viewfly/devtools/rollup-plugin-scoped-css` | **Rollup** 打包。 |
| `@viewfly/devtools/scoped-css-webpack-loader` | **Webpack**，在 `use` 链中替代或包裹对 scoped 资源的处理。 |

### Vite（最常用）

```ts
import { defineConfig } from 'vite'
import viteScopedCssPlugin from '@viewfly/devtools/vite-scoped-css-plugin'

export default defineConfig({
  plugins: [...viteScopedCssPlugin()]
})
```

默认导出是**插件数组**，需用展开运算符放入 `plugins`。

### 文件约定

样式路径需匹配形如 **`something.scoped.css`**（以及 `.scss`、`.less`、`.styl` 等）的命名；具体正则与在脚本中**默认导入得到 `scopeId` 字符串**、再写到 DOM 属性上的用法，见各子路径下的补充说明：

- [vite-scoped-css-plugin](./src/vite-scoped-css-plugin/README.md)
- [rollup-plugin-scoped-css](./src/rollup-plugin-scoped-css/README.md)
- [scoped-css-webpack-loader](./src/scoped-css-webpack-loader/README.md)

### PostCSS

上述工具**不负责**替你配置 autoprefixer 等 PostCSS 插件；若需要，请在 **Vite / PostCSS / Webpack** 的常规配置里单独增加，与 scoped 管线并行即可。

---

## 与运行时包的关系

构建结果中的选择器会带类似 **`[vf-xxxxxx]`** 的作用域属性。在 Viewfly 组件里为根节点打上对应 **`scopeId`** 才能命中样式，公开推荐做法是使用 **`@viewfly/core`** 的 **`withMark`**，详见官网 Scoped CSS 章节；历史项目可能仍引用 **`@viewfly/scoped-css`** 中的弃用 API。

---

## 文档

- **官网**：[viewfly.org](https://viewfly.org)

---

## License

MIT
