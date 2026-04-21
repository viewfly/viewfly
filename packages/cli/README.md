# @viewfly/cli

面向 **Viewfly** 应用的命令行脚手架：在本地快速生成基于 **Vite** 的 TypeScript 项目，并可选集成 **@viewfly/router** 与 **scoped CSS**（通过 `@viewfly/devtools` 的 Vite 插件）。

---

## 目录

- [适用场景](#适用场景)
- [安装](#安装)
- [快速开始](#快速开始)
- [命令与参数](#命令与参数)
- [交互式向导说明](#交互式向导说明)
- [可选功能详解](#可选功能详解)
- [生成项目里有什么](#生成项目里有什么)
- [常见问题与排错](#常见问题与排错)
- [链接与反馈](#链接与反馈)

---

## 适用场景

- 新建一个最小可运行的 Viewfly + Vite 前端工程。
- 需要在一行命令里指定模板、特性、包管理器，便于脚本或 CI 复用。
- 在 CI 里无交互生成固定模板的项目。

---

## 安装

### 全局安装（推荐日常使用）

```bash
npm install -g @viewfly/cli
# 或
pnpm add -g @viewfly/cli
```

安装后全局命令为 **`viewfly`**（见 `package.json` 的 `bin` 字段）。

### 不全局安装：使用 `npx` / `pnpm dlx`

```bash
npx @viewfly/cli create my-app
# 或
pnpm dlx @viewfly/cli create my-app
```

---

## 快速开始

```bash
viewfly create my-viewfly-app
# 等价别名
viewfly new my-viewfly-app
```

按提示选择可选特性、包管理器，以及是否在创建后立即安装依赖。完成后进入目录执行开发脚本即可。

```bash
cd my-viewfly-app
pnpm dev    # 或 npm run dev / yarn dev，取决于你选的包管理器
```

查看 CLI 自身版本：

```bash
viewfly --version
# 或
viewfly -v
```

查看顶层帮助：

```bash
viewfly --help
```

子命令帮助：

```bash
viewfly create --help
```

---

## 命令与参数

### `viewfly create <name>` / `viewfly new <name>`

在**当前工作目录**下创建名为 `<name>` 的子目录，并把模板拷贝到该目录。

| 选项 | 说明 |
|------|------|
| `-t, --template <template>` | 模板名称。当前仅内置 **`vite`**（默认）。若传入非 `vite` 且与交互结果不一致时，会通过交互选择（目前选项仍只有 `vite`）。 |
| `-f, --features <features>` | 逗号分隔的可选特性，见下文 [可选功能详解](#可选功能详解)。合法值：`router`、`scoped-css`。不传则进入多选交互。 |
| `--pm <packageManager>` | 安装依赖时使用的包管理器：`pnpm` \| `npm` \| `yarn`。不传则交互选择。 |
| `--install` | 创建完成后**立即**执行依赖安装。 |
| `--no-install` | 创建完成后**跳过**安装（仍会打印后续 `cd` 与手动安装提示）。 |
| （未传 install 相关 flag） | 由交互确认「是否现在安装依赖」，默认选「是」。 |

**约束与行为（与源码一致）：**

- **项目名必填**：`create` 必须带 `<name>`，否则 CLI 会提示错误并退出该流程。
- **目标目录必须不存在**：若 `./<name>` 已存在，会取消创建，避免覆盖。
- **非交互 CI 示例**：

  ```bash
  viewfly create my-app \
    --template vite \
    --features router,scoped-css \
    --pm pnpm \
    --install
  ```

---

## 交互式向导说明

在未通过命令行传入对应信息时，CLI 会使用 [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js) 依次询问：

1. **模板**：当前仅 `vite`。
2. **可选特性**：`router`、`scoped-css`（多选）。
3. **包管理器**：`pnpm` / `npm` / `yarn`。
4. **是否立即安装依赖**：默认为是。

若已通过 flag 提供某项信息，则跳过对应提问（例如已传 `--features` 则不再出现特性多选）。

---

## 可选功能详解

### `router`

- 在生成项目的 `package.json` 的 `dependencies` 中加入 **`@viewfly/router`**（版本与模板中其他 Viewfly 包保持一致，如 `^2.1.0`）。
- 重写 `src/main.tsx`：入口仍使用 `createApp`，`App` 组件文案会提示已启用 Router，便于你在此基础上自行配置路由。

> 说明：脚手架**不会**自动生成路由表或文件结构，仅添加依赖与示例文案。

### `scoped-css`

- 在 `package.json` 的 `devDependencies` 中加入 **`@viewfly/devtools`**（当前脚手架内写为 `^2.0.0`，可按需在生成后自行对齐 monorepo 版本）。
- 生成 `src/app.scoped.scss` 示例样式。
- 重写 `src/main.tsx`：改为 `import './app.scoped.scss'`，不再引用默认的 `./style.css`。
- 重写 `vite.config.ts`：注册 `@viewfly/devtools/vite-scoped-css-plugin` 导出的 Vite 插件。

可同时指定 `router,scoped-css`，两者会叠加生效。

---

## 生成项目里有什么

模板位于本包的 **`templates/base-vite`**，发布时由 `package.json` 的 `files` 字段打进 npm 包。

- **构建工具**：Vite 8、TypeScript 5.8。
- **运行时依赖**：`@viewfly/core`、`@viewfly/platform-browser`（与 CLI 发布版本线一致，如 `^2.1.0`）。
- **占位符**：模板中的 `package.json` 的 `name` 字段为 **`__PROJECT_NAME__`**，创建过程中会替换为你在命令行传入的 `<name>`。
- **入口**：`src/main.tsx` + `index.html`，使用 JSX 风格编写 Viewfly 组件。
- **脚本**：`dev` / `build` / `preview` 均为标准 Vite 命令。

未启用 `scoped-css` 时，默认带 `src/style.css`；启用后由 `app.scoped.scss` 与 Vite 插件接管样式入口（见上节）。

---

## 常见问题与排错

### `target directory already exists`

当前设计**不允许**覆盖已有目录。请更换项目名，或先删除/移走旧目录。

### 依赖安装失败

使用 `--install` 或交互选择安装时，若 `pnpm` / `npm` / `yarn` 返回非零退出码，CLI 会抛出错误。请检查：

- 本机是否已安装所选包管理器；
- 网络与 registry 配置；
- Node 版本是否满足 Vite 与 Viewfly 的要求。

可改用 `--no-install`，在工程目录内手动排查后再执行安装。

### Windows

安装子进程在 Windows 上会使用 `shell: true` 调用包管理器，一般可正常执行 `pnpm install` / `npm install` / `yarn`。

### 清屏与 ASCII 横幅

CLI 启动时会 `clear` 终端并打印 figlet 横幅；在部分 CI 日志环境中可能显得「刷屏」，属预期行为。

---

## 链接与反馈

- 仓库：<https://github.com/viewfly/viewfly>
- Issue：<https://github.com/viewfly/viewfly/issues>

---

## License

MIT（见仓库内 `LICENSE` 文件）。
