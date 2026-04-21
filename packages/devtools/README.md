Viewfly
================================

> 本项目借鉴 Vue 的 scoped css 思路，特别鸣谢！

Viewfly 是一个简单、数据驱动的前端框架。

此项目为 Viewfly 的开发工具包，详情请参考官方网站：[viewfly.org](https://viewfly.org)

## 安装

```bash
npm install @viewfly/devtools -D
```

## 子包说明（scoped CSS）

本包通过 `package.json` 的 `exports` 暴露多条入口，常用与 **作用域样式** 相关的三个工具如下：

| 入口 | 说明文档 |
|------|----------|
| `@viewfly/devtools/vite-scoped-css-plugin` | [src/vite-scoped-css-plugin/README.md](./src/vite-scoped-css-plugin/README.md) |
| `@viewfly/devtools/rollup-plugin-scoped-css` | [src/rollup-plugin-scoped-css/README.md](./src/rollup-plugin-scoped-css/README.md) |
| `@viewfly/devtools/scoped-css-webpack-loader` | [src/scoped-css-webpack-loader/README.md](./src/scoped-css-webpack-loader/README.md) |

使用 Vite 时，与本仓库 **CLI 脚手架**（`create` 勾选 `scoped-css`）生成的 `vite.config` 对齐的配置，见 `packages/cli/src/run.ts` 中的 `buildViteConfigSource`。

开发本包请先执行 `pnpm -C packages/devtools run build:lib` 生成 `dist/`。
