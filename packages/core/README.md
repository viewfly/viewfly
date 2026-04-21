# @viewfly/core

Viewfly 的**内核包**：函数组件、JSX、响应式与信号、`watch`、生命周期、`inject` 与 IoC 相关 API、以及 **`withMark`** 等与 UI 逻辑直接相关的入口均由此包提供。

在浏览器里挂载应用请使用 **`@viewfly/platform-browser`** 的 **`createApp`**（其内部使用本包提供的应用模型）。

---

## 安装

```bash
pnpm add @viewfly/core
# 或 npm / yarn
```

本包依赖 **`reflect-metadata`**。正常从 **`@viewfly/core`** 的主入口导入时，会随模块加载一并初始化；若你的打包拆包方式导致依赖注入相关运行时异常，可在应用入口**最先**增加显式导入：

```ts
import 'reflect-metadata'
```

更稳妥的做法以 [官网](https://viewfly.org) 与当前版本的说明为准。

---

## JSX / TSX 配置

在 **`tsconfig.json`** 中启用 automatic JSX runtime，并把来源指向本包：

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

使用 Babel 时，将 `@babel/preset-react` 的 `runtime: "automatic"` 与 `importSource: "@viewfly/core"` 对齐上述行为。

---

## 能力速览（面向使用者）

以下为日常开发中最常见的方向，**具体类型与参数以类型定义和官网为准**。

| 方向 | 公开 API 与用法提示 |
|------|---------------------|
| 组件 | 函数组件：在 JSX 中当标签使用；配合生命周期钩子使用。 |
| 生命周期 | **`onMounted`**、**`onUpdated`**、**`onUnmounted`** 等（须在组件 setup 阶段调用）。 |
| 响应式 | **`reactive`**、**`shallowReactive`**、**`watch`** 等（`reactive` 模块）。 |
| 信号 | **`createSignal`**、**`createEffect`**、**`createDerived`** 等（`signals` 模块）。 |
| 依赖注入 | 在组件内用 **`inject`** 解析 token；用 **`Injectable()`** 声明可注入类；用 **`withAnnotation`** 或 **`createContext`** / **`createContextProvider`** 挂载 **`Provider`**；根应用上通过 **`createApp(...).provide(...)`**（由 **`@viewfly/platform-browser`** 提供）注册全局提供者。 |
| 自定义 DOM 属性标记 | **`withMark(marks, setup)`**：为组件渲染出的元素附加与 `marks` 同名的属性（常用于 scoped CSS 的 `scopeId` 等场景）。 |

**说明**：源码中可能存在标有 **`@internal`** 或未在官网文档化的符号，它们仅供框架内部或实验用途，**不建议业务代码依赖**；升级版本时也可能在无 semver 预告的情况下变更。

---

## 文档与示例

- **官方文档**：[viewfly.org](https://viewfly.org)
- **本仓库试跑**：仓库根目录执行 `pnpm dev` 打开 playground

---

## License

MIT
