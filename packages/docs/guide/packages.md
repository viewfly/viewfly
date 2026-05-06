# npm 包一览

按常见使用顺序简要说明。

| 包名 | 用途 |
|------|------|
| [@viewfly/core](https://www.npmjs.com/package/@viewfly/core) | 内核：组件、响应式、`signal`、`JSX` 运行时、生命周期、`inject` 等。 |
| [@viewfly/platform-browser](https://www.npmjs.com/package/@viewfly/platform-browser) | 浏览器：`createApp`、挂载与销毁。 |
| [@viewfly/router](https://www.npmjs.com/package/@viewfly/router) | 路由：`RouterModule`、`Link`、`RouterOutlet` 等。 |
| [@viewfly/devtools](https://www.npmjs.com/package/@viewfly/devtools) | 构建侧：`*.scoped.*` 样式与 `Vite` / `Rollup` / `Webpack` 集成；另含 **`Vite` 开发态下的组件 HMR**（生产构建不加载）。 |
| [@viewfly/cli](https://www.npmjs.com/package/@viewfly/cli) | 脚手架，生成 `Vite` + `TypeScript` 模板。 |

路由与 scoped CSS 均为可选。scoped CSS 需 **`@viewfly/core`**（如 `withMark`）与 **`@viewfly/devtools`** 配合使用。官方脚手架生成的 **`Vite`** 模板会默认安装 **`@viewfly/devtools`** 并注册 **HMR**；若你自建工程，可按该包在 npm 上的说明自行接入 **`vite-viewfly-hmr-plugin`**。

## 下一步

- [常见问题](./faq.md)
