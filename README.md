<h1 align="center"><img src="./_source/logo.svg" alt="Viewfly" width="60px" align="center"> Viewfly</h1>

<p align="center">🚀 一个简单、易上手、数据驱动的前端框架。</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green">
  <img src="https://img.shields.io/npm/v/%40viewfly%2Fcore">
  <img src="https://img.shields.io/npm/dm/%40viewfly/core">
  <img src="https://img.shields.io/badge/coverage-100%25-blue">
</p>


为什么要开发 Viewfly？现在前端开发基本都围绕三大框架，也有一些更多的新星框架在圈内引起了大量关注，要在这种基础之上再推陈出新，无疑是非常困难的事情。

不过，它们都太复杂了，有的创建组件要写很多样板代码，有的需要特殊的语法或编译，有的不方便与 TypeScript 集成，有的有闭包陷阱等等。这给了 Viewfly 推出的契机。


## 从这里开始

- **完整教程与 API**：请优先阅读官网 **[viewfly.org](https://viewfly.org)**。
- **本仓库**：Viewfly 各 npm 包与示例工程的源码（pnpm monorepo）。若你只想做业务开发，通常只需安装下方 npm 包，不必克隆本仓库。

## 环境要求

本仓库开发脚本要求 **Node** `^20.19.0 || >=22.12.0`，包管理器为 **pnpm**（见根目录 `package.json` 的 `packageManager` 字段）。

## 在业务项目里使用 Viewfly

### 方式一：脚手架（推荐）

全局安装 CLI 后创建 Vite + TypeScript 项目，可按提示勾选路由、scoped CSS 等：

```bash
npm install -g @viewfly/cli
viewfly create my-app
cd my-app
pnpm dev
```

详见 npm 包 **`@viewfly/cli`** 的说明：[packages/cli/README.md](./packages/cli/README.md)。

### 方式二：手动安装核心包

在已有 bundler（Vite、Webpack 等）的项目中安装：

```bash
pnpm add @viewfly/core @viewfly/platform-browser
```

**JSX / TSX**：在 `tsconfig.json` 中配置（与 React automatic runtime 类似，只是把来源换成 Viewfly）：

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

使用 **Babel** 时，请将 `preset-react` 的 `importSource` 设为 `@viewfly/core`（与官网「构建工具」章节一致）。

在页面中挂载应用：

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
| [@viewfly/core](./packages/core/README.md) | 框架内核：组件、响应式、信号、JSX 运行时等。 |
| [@viewfly/platform-browser](./packages/platform-browser/README.md) | 浏览器端：`createApp`、挂载与销毁等。 |
| [@viewfly/router](./packages/router/README.md) | 浏览器端路由：`RouterModule`、`Link`、`RouterOutlet` 等。 |
| [@viewfly/devtools](./packages/devtools/README.md) | 构建工具：Vite / Rollup / Webpack 下的 `*.scoped.*` 样式支持等。 |
| [@viewfly/cli](./packages/cli/README.md) | 命令行脚手架，生成工程模板。 |

按需安装即可；路由为可选能力。scoped CSS 请配合 `@viewfly/core` + `@viewfly/devtools` 使用。

## 克隆本仓库后（贡献者 / 本地试跑）

```bash
pnpm install
pnpm dev
```

默认会启动 **`@viewfly/playground`** 的 Vite 开发服务器，便于本地查看示例。构建全部子包：

```bash
pnpm run build
```

更多脚本见根目录 `package.json` 的 `scripts`。

## 赞助

如果你愿意支持 Viewfly 的发展，同时鼓励我们做得更好，欢迎通过下面的二维码表达你的支持。

![](./_source/wx.jpg) ![](./_source/alipay.jpg)

## License

MIT
