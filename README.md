<h1 align="center"><img src="./_source/logo.svg" alt="Viewfly" width="60px" align="center"> Viewfly</h1>

<p align="center">🚀 一个简单、易上手、数据驱动的前端框架。</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@viewfly/core"><img src="https://img.shields.io/npm/v/@viewfly/core" alt="npm version @viewfly/core"></a>
  <a href="https://www.npmjs.com/package/@viewfly/core"><img src="https://img.shields.io/npm/dm/@viewfly/core" alt="npm downloads @viewfly/core"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
</p>


为什么要开发 Viewfly？现在前端开发基本都围绕三大框架，也有一些更多的新星框架在圈内引起了大量关注，要在这种基础之上再推陈出新，无疑是非常困难的事情。

不过，它们都太复杂了，有的创建组件要写很多样板代码，有的需要特殊的语法或编译，有的不方便与 TypeScript 集成，有的有闭包陷阱等等。这给了 Viewfly 推出的契机。


## 从这里开始

- **完整教程与 API**：请优先阅读官网 **[viewfly.org](https://viewfly.org)**。
- **本仓库**：Viewfly 各 npm 包与示例工程的源码（pnpm monorepo）。若你只想做业务开发，通常只需安装下方 npm 包，不必克隆本仓库。

## 环境要求

- **在本仓库中开发**：**Node** `^20.19.0 || >=22.12.0`，包管理器 **pnpm**（版本见根目录 `package.json` 的 `packageManager`）。
- **在业务项目中**：以满足 **Vite / TypeScript** 与所安装的 `@viewfly/*` 版本为准。

## 在业务项目里使用 Viewfly

### 方式一：脚手架（推荐）

```bash
npm install -g @viewfly/cli
viewfly create my-app
cd my-app
pnpm dev
```

说明见 [@viewfly/cli](./packages/cli/README.md)。也可用 `npx @viewfly/cli create my-app` / `pnpm dlx @viewfly/cli create my-app` 避免全局安装。

### 方式二：手动安装核心包

```bash
pnpm add @viewfly/core @viewfly/platform-browser
```

**JSX / TSX**：在 `tsconfig.json` 中启用 automatic JSX runtime，并将来源指向 Viewfly（与 React 的 `jsxImportSource` 用法相同，仅包名不同）：

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

使用 **Babel** 时，将 `@babel/preset-react` 设为 `runtime: "automatic"` 且 `importSource: "@viewfly/core"`。

依赖注入相关能力依赖 **`reflect-metadata`**。从 `@viewfly/core` 主入口导入时会随模块加载初始化；若拆包导致异常，可在应用入口最前增加 `import 'reflect-metadata'`（详见 [@viewfly/core](./packages/core/README.md)）。

**最小挂载示例**：

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({ count: 0 })

function App() {
  return () => <div>{model.count}</div>
}

createApp(<App />).mount(document.getElementById('app')!)
```

## npm 包一览（按常见使用顺序）

| 包名 | 用途 |
|------|------|
| [@viewfly/core](./packages/core/README.md) | 内核：组件、响应式、信号、JSX 运行时、生命周期、`inject` 等。 |
| [@viewfly/platform-browser](./packages/platform-browser/README.md) | 浏览器：`createApp`、挂载与销毁等。 |
| [@viewfly/router](./packages/router/README.md) | 路由：`RouterModule`、`Link`、`RouterOutlet` 等。 |
| [@viewfly/devtools](./packages/devtools/README.md) | 构建侧：`*.scoped.*` 样式与 Vite / Rollup / Webpack 集成。 |
| [@viewfly/cli](./packages/cli/README.md) | 脚手架，生成 Vite + TypeScript 模板。 |

路由与 scoped CSS 均为可选；scoped CSS 需 **`@viewfly/core`**（如 `withMark`）与 **`@viewfly/devtools`** 配合，细节见 devtools 包 README。

## 克隆本仓库后（贡献 / 本地试跑）

```bash
pnpm install
pnpm dev
```

默认启动 **`@viewfly/playground`**。构建全部可发布的子包：

```bash
pnpm run build
```

其余脚本见根目录 `package.json` 的 `scripts`。

## 赞助

若你愿意支持 Viewfly 的持续维护，可通过下方二维码表达支持。

![](./_source/wx.jpg) ![](./_source/alipay.jpg)

## License

MIT
