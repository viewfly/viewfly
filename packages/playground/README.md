# @viewfly/playground

本 monorepo 中的 **本地演示工程**：依赖 workspace 内的 `@viewfly/core`、`@viewfly/platform-browser`、`@viewfly/router`、`@viewfly/scoped-css`，用于开发过程中手动验证框架行为。**不会发布到 npm**（`private: true`）。

---

## 何时会用到

- 你已克隆 [viewfly 仓库](https://github.com/viewfly/viewfly)，想快速跑起一个 Viewfly 页面做实验或调试。
- 你为框架提 PR，需要在真实 bundler（Vite）下走一遍流程。

若你只是在业务项目里使用 Viewfly，请使用 **`@viewfly/cli`** 创建独立应用，不必使用本包。

---

## 如何运行

在仓库根目录安装依赖后：

```bash
pnpm install
pnpm dev
```

等价于 `pnpm --filter @viewfly/playground dev`，默认启动 Vite 开发服务器（端口以终端输出为准）。

构建与预览：

```bash
pnpm run build:playground
pnpm run preview:playground
```

---

## 文档

业务开发请优先阅读官网 **[viewfly.org](https://viewfly.org)** 与各 npm 包 README。

---

## License

与根仓库一致（MIT）。
