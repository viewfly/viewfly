<h1 align="center"><img src="./_source/logo.svg" alt="Viewfly" width="60px" align="center"> Viewfly</h1>

<p align="center">🚀 一个简单、易上手、数据驱动的前端框架。</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@viewfly/core"><img src="https://img.shields.io/npm/v/@viewfly/core" alt="npm version @viewfly/core"></a>
  <a href="https://www.npmjs.com/package/@viewfly/core"><img src="https://img.shields.io/npm/dm/@viewfly/core" alt="npm downloads @viewfly/core"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue" alt="License MIT">
</p>

<p align="center"><strong>Languages:</strong> <a href="./README.en.md">English</a></p>


为什么要开发 Viewfly？现在前端开发基本都围绕三大框架，也有一些更多的新星框架在圈内引起了大量关注，要在这种基础之上再推陈出新，无疑是非常困难的事情。

不过，它们都太复杂了，有的创建组件要写很多样板代码，有的需要特殊的语法或编译，有的不方便与 TypeScript 集成，有的有闭包陷阱等等。这给了 Viewfly 推出的契机。


## 从这里开始

查阅 **[官方文档](https://viewfly.org)**，再看下方 **最小示例**；依赖可用 **脚手架** 或 **npm** 安装，**无需克隆本仓库**。

## Viewfly 最小示例

函数组件返回**渲染函数**；用 **`reactive`** 做响应式数据，用 **`createApp`** 挂到页面上：

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({ count: 0 })

function App() {
  return () => <div>{model.count}</div>
}

createApp(<App />).mount(document.getElementById('app')!)
```

## 安装

**环境**：**`Vite`**、**`TypeScript`** 与 **`@viewfly/*`** 的版本需彼此匹配（**Node** 需满足所选 **Vite** 的要求）。

### 方式一：脚手架（推荐）

```bash
npm install -g @viewfly/cli
viewfly create my-app
cd my-app
npm run dev
```

说明见 [@viewfly/cli](./packages/cli/README.md)（[English](./packages/cli/README.en.md)）。也可用 `npx @viewfly/cli create my-app` 避免全局安装。

### 方式二：手动安装核心包

```bash
npm install @viewfly/core @viewfly/platform-browser
```

**`JSX` / `TSX`**：在 `tsconfig.json` 中启用 automatic `JSX` runtime，并将来源指向 Viewfly（与 `React` 的 `jsxImportSource` 用法相同，仅包名不同）：

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

使用 `Babel` 时，将 `@babel/preset-react` 设为 `runtime: "automatic"` 且 `importSource: "@viewfly/core"`。

依赖注入相关能力依赖 **`reflect-metadata`**。从 `@viewfly/core` 主入口导入时会随模块加载初始化；若拆包导致异常，可在应用入口最前增加 `import 'reflect-metadata'`（详见 [@viewfly/core](./packages/core/README.md)，[English](./packages/core/README.en.md)）。

## npm 包一览（按常见使用顺序）

| 包名 | 用途 |
|------|------|
| [@viewfly/core](./packages/core/README.md) | 内核：组件、响应式、`signal`、`JSX` 运行时、生命周期、`inject` 等。 |
| [@viewfly/platform-browser](./packages/platform-browser/README.md) | 浏览器：`createApp`、挂载与销毁等。 |
| [@viewfly/router](./packages/router/README.md) | 路由：`RouterModule`、`Link`、`RouterOutlet` 等。 |
| [@viewfly/devtools](./packages/devtools/README.md) | 构建侧：`*.scoped.*` 样式与 `Vite` / `Rollup` / `Webpack` 集成；另含 **`Vite` 开发态下的组件 HMR**（生产构建不加载），其它说明见包内文档。 |
| [@viewfly/cli](./packages/cli/README.md) | 脚手架，生成 `Vite` + `TypeScript` 模板。 |

（英文说明：**仓库根** [README.en.md](./README.en.md)；各 `@viewfly/*` 包见对应目录下的 `README.en.md`。）

路由与 scoped CSS 均为可选。scoped CSS 需 **`@viewfly/core`**（如 `withMark`）与 **`@viewfly/devtools`** 配合。脚手架生成的 **Vite** 模板已包含 **`@viewfly/devtools`**；其它集成方式见该包 README。

## 克隆本仓库后（贡献 / 本地试跑）

参与 Viewfly 开发、本地试跑 **playground**、或从源码构建文档站点时，再克隆本仓库（**pnpm** monorepo，内含各 **`@viewfly/*`** 包与示例工程）。

**环境**：**Node** `^20.19.0 || >=22.12.0`，包管理器 **pnpm**（版本见根目录 `package.json` 的 `packageManager`）。

**文档站点（VitePress）源码**在 **`packages/docs`**：在仓库根目录执行 `npm run docs:dev` 可本地预览，`npm run docs:build` 构建静态站点（产物在 `packages/docs/.vitepress/dist`）。

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
