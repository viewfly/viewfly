# 安装与配置

本页聚焦一件事：把 Viewfly 相关依赖与编译配置一次配好。以下命令以 **npm** 为例；若你使用 `yarn`、`pnpm` 等，请换成对应命令。

## 环境要求

你需要先确认本机 `Node.js` 版本满足构建工具要求（例如 Vite 常见为 `^20.19` 或 `>=22.12`），并在使用 `TSX` 时安装与工程一致的 `typescript`。

## 安装核心包

```bash
npm install @viewfly/core @viewfly/platform-browser
```

如果你要用路由或调试工具，再按需安装：

```bash
npm install @viewfly/router
npm install -D @viewfly/devtools
```

各包用途见 [npm 包一览](./packages.md)。

## TypeScript 配置（JSX 必需）

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

`target`、`module` 等其它字段按你的工具链需求调整，但上面两项必须保持正确。

## 依赖注入（装饰器）配置

如果你会使用 `@Injectable()` 等装饰器注入，再继续完成下面三步配置。

### 1) `tsconfig.json`

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 2) 入口加载 metadata

通常从 `@viewfly/core` 主入口导入即可；如果运行时仍出现注入异常，可在入口最前补：

```ts
import 'reflect-metadata'
```

### 3) Vite 编译链路（metadata 产出）

方案 A：Vite + SWC

```bash
npm install -D vite-plugin-swc-transform
```

```ts
import { defineConfig, type Plugin } from 'vite'
import swc from 'vite-plugin-swc-transform'

export default defineConfig({
  plugins: [
    swc({
      swcOptions: {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
            tsx: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
        },
      },
    }) as Plugin,
  ],
})
```

方案 B：Vite + Babel

```bash
npm install -D @babel/core @babel/plugin-proposal-decorators babel-plugin-transform-typescript-metadata vite-plugin-babel
```

```ts
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          'babel-plugin-transform-typescript-metadata',
        ],
      },
    }),
  ],
})
```

## 下一步

- [快速上手](./quick-start.md)（最快跑起来）
- [创建应用](./essentials-application.md)（理解应用入口与生命周期）
- [脚手架与工具链](./cli.md)
