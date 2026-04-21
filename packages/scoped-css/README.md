# @viewfly/scoped-css

与 **Viewfly 作用域样式**相关的运行时辅助包。多数情况下，你还会配合 **`@viewfly/devtools`** 里提供的 Vite / Rollup / Webpack 集成，在构建阶段处理 `*.scoped.*` 样式文件。

---

## 何时需要这个包

- 你已经按官网或 devtools 文档配置好了 **scoped 样式管线**，需要在组件树里为 DOM 打上与 **`scopeId`** 一致的标记时，可参考本包与内核提供的 API。
- **新代码推荐**：优先使用 **`@viewfly/core`** 提供的 **`withMark`** 等与标记相关的公开 API（与官网 [Scoped CSS 指南](https://viewfly.org/guide/scoped-css) 对齐）。

本包导出的 **`withScopedCSS`** 为历史 API，**已标记弃用**，仅建议在维护旧项目时继续使用；新项目请按官网迁移到 `withMark` 等写法。

---

## 安装

```bash
pnpm add @viewfly/scoped-css @viewfly/core
```

构建期 scoped 编译请安装 **`@viewfly/devtools`**（开发依赖），并按 [devtools 说明](../devtools/README.md) 选择 Vite / Rollup / Webpack 入口。

---

## 文档

- **Scoped CSS 使用指南**：[viewfly.org/guide/scoped-css](https://viewfly.org/guide/scoped-css)
- **构建工具集成**：[@viewfly/devtools](../devtools/README.md)

---

## License

MIT
