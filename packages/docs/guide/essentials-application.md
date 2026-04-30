# 创建应用

在浏览器里，Viewfly 通过 **`createApp`** 创建应用，再用 **`mount`** 挂到真实 **`DOM`** 节点。本页聚焦应用入口、生命周期和应用实例 API；安装与工具链配置请看 [安装与配置](./installation.md)。

## 从入口到屏幕

1. **准备挂载点**：例如 `index.html` 里有 `<div id="app"></div>`。  
2. **创建应用实例**：在入口调用 `createApp(<App />)`。  
3. **挂载到 DOM**：`mount(container)` 后完成首次渲染。  
4. **销毁（可选）**：不再使用时调用 `destroy()` 清理资源。

你可以把整条链路理解为：**`DOM` 容器 -> `createApp(根 JSX)` -> `mount(容器)` -> `destroy()`（可选）**。

## 最小可运行示例

下面是最小可运行示例。先保证页面里有 **`#app`**，再把根组件挂进去。

```html
<div id="app"></div>
```

```tsx
import { createApp } from '@viewfly/platform-browser'
import { reactive } from '@viewfly/core'

function App() {
  const model = reactive({ n: 0 })
  return () => <button type="button" onClick={() => model.n++}>{model.n}</button>
}

const el = document.getElementById('app')
if (!el) {
  throw new Error('挂载点 #app 不存在')
}

const app = createApp(<App />)
app.mount(el)
```

`mount` 参数必须是实际存在的 DOM 节点。若 `getElementById` 返回 `null`，建议像示例一样先做显式校验。

下面两种写法等价。需要 `provide` / `use` 时，通常会使用链式写法：

```tsx
const app = createApp(<App />)
app.mount(el)

createApp(<App />).mount(el)
```

## 应用实例上的常用方法

`createApp` 返回应用实例（类型为 `Application`），常用成员如下。

| 方法 | 作用 |
|------|------|
| **`createApp(root, options?)`** | 用根 `JSX` 创建实例。第二参数可为 `boolean`（是否自动更新）或配置对象。 |
| **`mount(container)`** | 挂载并完成首次渲染；同一实例只能成功调用一次。 |
| **`destroy()`** | 销毁应用并触发模块清理。 |
| **`provide(providers)`** | 在应用根注册 DI `Provider`（单个或数组）。 |
| **`use(module)`** | 在 `mount` 之前注册 `Module`（单个或数组）。 |
| **`render()`** | 关闭自动更新时手动刷新视图。 |

链式示例：

```tsx
createApp(<App />)
  .provide(/* Provider | Provider[] */)
  .use(/* Module | Module[] */)
  .mount(document.getElementById('app')!)
```

## provide、use 与 mount 的顺序

推荐顺序是先 `createApp(<Root />)`，然后在 `mount` 前完成 `provide(...)` 与 `use(...)`，最后再 `mount(container)`。`Module` 的 `setup` 会在 `mount` 流程中执行，所以 `use(...)` 必须提前完成。

## 注意点与排错

- **重复 `mount`**：同一应用实例第二次调用 **`mount`** 会抛出 **`application has already started.`** 类错误。需要换根节点或新应用时，应 **`destroy`** 后新建 **`createApp`**，或使用新实例。  
- **忘记 `destroy`**：长时间运行的单页应用在移除根节点、切换技术栈或部分测试场景下，应调用 **`destroy()`**，避免悬挂的更新与模块逻辑。  
- **挂载点不对**：**`id`** 与 **`getElementById`** 不一致、或脚本在 **`DOM`** 就绪前执行，会导致 **`null`** 或非预期容器——表现为白屏或内容挂错位置。  

## 手动刷新模式（可选）

当你希望自己控制刷新时机（常见于测试或外部调度）时，可以把 `createApp` 的第二参数设为 `false`（或 `{ autoUpdate: false }`）：

```tsx
const app = createApp(<App />, false)
app.mount(document.getElementById('app')!)

// 状态变化后手动触发刷新
app.render()
```

完整语义与更多场景见 [应用深入](./application-in-depth.md) 的 `autoUpdate` / `render()` 小节。

## 下一步

- [JSX 与组件](./essentials-components.md)  
- [响应式](./essentials-reactivity.md)  
- [应用深入](./application-in-depth.md)（**`autoUpdate`**、**`render`**、**`Module`** 钩子）  
- [路由](./router.md)（可选，见侧栏 **规模化**）
