# 脚手架 CLI

**`@viewfly/cli`** 用于生成基于 `Vite` + `TypeScript` 的 Viewfly 项目模板，可选特性（如 scoped 样式）与生成文件以当前 `CLI` 版本为准。

## 参数速查

- `--template <name>`：模板名（当前常用为 `vite`）。
- `--features <list>`：可选特性，逗号分隔（如 `router,scoped-css`）。
- `--pm <pnpm|npm|yarn>`：指定包管理器。
- `--install`：创建后自动安装依赖。

## 使用方式

```bash
npm install -g @viewfly/cli
viewfly create my-app
```

或免全局安装：

```bash
npx @viewfly/cli create my-app
```

无交互（适合脚本或 CI）：

```bash
npx @viewfly/cli create my-app \
  --template vite \
  --features router,scoped-css \
  --pm pnpm \
  --install
```

进入项目目录后按模板说明安装依赖并启动开发服务器（通常为 `npm run dev`）。

## 常见问题

- **命令不存在**：若使用全局安装，确认全局 bin 已加入系统 `PATH`；或直接改用 `npx @viewfly/cli create my-app`。
- **全局安装权限报错**：避免强行提权，优先使用 `npx` / `pnpm dlx` / `yarn dlx` 的一次性执行方式。
- **创建后依赖未安装**：创建时未传 `--install` 或选择了不自动安装，进入目录手动执行 `npm install` / `pnpm install` / `yarn`。

## 说明

更完整的选项与模板结构见 npm 上的 **[@viewfly/cli](https://www.npmjs.com/package/@viewfly/cli)** 说明。

## 下一步

- [安装与配置](./installation.md)
- [快速上手](./quick-start.md)
- [npm 包一览](./packages.md)
