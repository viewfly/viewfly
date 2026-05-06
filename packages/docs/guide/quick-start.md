# 快速上手

本页只做一件事：用官方脚手架把第一个 Viewfly 应用跑起来。

## 快速体验

如果你已经完成 [安装与配置](./installation.md)，下面照着执行就能看到第一个页面。

## 创建一个 Viewfly 应用

先在你准备放项目的目录里打开终端，再执行创建命令。

### 使用脚手架

`@viewfly/cli` 会在当前目录下新建工程并写入模板。下面是一次性执行（无需全局安装）的写法：

::: code-group

```bash [npm]
npx @viewfly/cli create my-app
```

```bash [pnpm]
pnpm dlx @viewfly/cli create my-app
```

```bash [yarn]
yarn dlx @viewfly/cli create my-app
```

```bash [bun]
bun x @viewfly/cli create my-app
```

:::

如果你没有通过命令行传入选项，向导会依次询问模板、可选特性、包管理器和是否自动安装依赖；不确定时直接回车使用默认值即可。

**无交互（适合脚本或 CI）** 的示例：

```bash
npx @viewfly/cli create my-app \
  --template vite \
  --features router,scoped-css \
  --pm pnpm \
  --install
```

创建完成后进入项目目录。若创建时**没有**自动安装依赖，就先安装再启动开发服务器：

::: code-group

```bash [npm]
cd my-app
npm install
npm run dev
```

```bash [pnpm]
cd my-app
pnpm install
pnpm dev
```

```bash [yarn]
cd my-app
yarn
yarn dev
```

```bash [bun]
cd my-app
bun install
bun run dev
```

:::

终端会打印本地预览地址（通常是 `http://localhost:5173`）；在浏览器打开它，就能看到应用页面。

### 生产构建

准备发布到线上时，在工程根目录执行：

::: code-group

```bash [npm]
npm run build
```

```bash [pnpm]
pnpm build
```

```bash [yarn]
yarn build
```

```bash [bun]
bun run build
```

:::

产物通常在 **`dist/`**，由 **`Vite`** 生成。部署方式取决于你的静态资源托管或后端方案，不在本页展开。

### 小提示

- 模板里已经包含基础的 TypeScript/JSX 配置。
- 官方脚手架的 **`Vite`** 模板已接入 **Viewfly HMR**（`@viewfly/devtools`），开发时保存 **`TSX`/`JSX`** 一般可热更新组件；行为细节与限制见 [脚手架与工具链](./cli.md)。
- 如果你会用装饰器注入（DI），请按 [安装与配置](./installation.md) 补齐 metadata 编译链路。

## 入口长什么样

脚手架生成的 **`src/main.tsx`** 会与下面类似（具体以模板为准）：用 **`createApp`** 挂载根组件到 **`index.html`** 中的容器节点。

```tsx
import { createApp } from '@viewfly/platform-browser'
import { App } from './app'

createApp(<App />).mount(document.getElementById('app')!)
```

应用入口通过 `createApp` 把根组件挂到 `#app`；你可以在 [创建应用](./essentials-application.md) 里继续看完整生命周期和常见用法。

## 下一步

- [创建应用](./essentials-application.md)
- [JSX 与组件](./essentials-components.md)
- [响应式](./essentials-reactivity.md)
- [脚手架与工具链](./cli.md)
