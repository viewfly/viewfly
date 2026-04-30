# 应用深入

在 [创建应用](./essentials-application.md) 里，你已经能完成“创建并挂载”这个闭环。本页继续往前走一步：解释应用实例在运行期的行为语义，以及在中大型工程里如何组织 `provide`、`use`、`render`、`destroy`。

## 应用实例的运行时模型

可以把应用实例理解为一条固定生命周期：

1. `createApp(root, ...)`：创建应用实例，收集配置与待装配能力。
2. `provide(...)` / `use(...)`：在启动前装配根级依赖与模块。
3. `mount(container)`：启动应用并完成首次渲染。
4. `render()`（可选）：手动触发一次刷新。
5. `destroy()`：销毁应用并触发模块清理。

其中有两个行为很关键：同一实例只能成功 `mount` 一次，再次调用会报“应用已启动”错误；`destroy()` 之后也不应把该实例当作可重新启动对象使用，重新启动请新建实例。

## `autoUpdate` 与 `render()` 的刷新策略

`createApp` 常见写法有两类：

- `createApp(root, autoUpdate?: boolean)`
- `createApp(root, config?: Partial<ConfigWithoutRoot>)`

### 默认模式：自动刷新

`autoUpdate` 默认是 `true`。响应式数据变化后，应用会按默认调度路径刷新视图。

```tsx
const app = createApp(<App />)
app.mount(document.getElementById('app')!)
// 后续响应式状态变化会自动刷新视图
```

### 手动模式：显式刷新

当 `autoUpdate` 设为 `false`，应用只完成首次渲染；后续要靠 `app.render()` 主动刷新。

```tsx
const app = createApp(<App />, { autoUpdate: false })
app.mount(document.getElementById('app')!)

// 修改了影响视图的状态后，手动触发一次渲染
app.render()
```

这种模式常见于测试、外部调度控制，或者你希望把多次状态变更合并成一次可控刷新。如果你只想先建立“创建与挂载”的基础心智模型，可先看 [创建应用](./essentials-application.md)。

## `Module` 机制与生命周期钩子

应用模块通过 `app.use(module)` 注册。一个模块通常会围绕三个阶段写逻辑：`setup(app)` 在 `mount` 期间、首次渲染前执行，适合做初始化装配；`onAfterStartup(app)` 在首次渲染后执行，适合启动依赖“页面已启动”的逻辑；`onDestroy()` 在 `app.destroy()` 时执行，适合清理订阅、定时器、连接等资源。

```tsx
import type { Module } from '@viewfly/core'

const MetricsModule: Module = {
  setup(app) {
    app.provide([{ provide: METRICS_ENABLED, useValue: true }])
  },
  onAfterStartup() {
    startMetricsCollect()
  },
  onDestroy() {
    stopMetricsCollect()
  },
}
```

同一应用可以注册多个模块，执行顺序与 `use(...)` 的注册顺序一致。若模块之间有依赖关系，建议把顺序写明确，避免隐式耦合。

## 应用级装配：`provide` 与 `use` 如何配合

实践中常见两种装配策略：

### 入口集中装配

在主入口统一声明基础依赖与核心模块，结构清晰，适合大多数应用。

```tsx
createApp(<App />)
  .provide([ConfigService, LoggerService])
  .use([RouterModule, MetricsModule])
  .mount(document.getElementById('app')!)
```

### 模块自装配

由模块在 `setup` 内补充自身所需的 provider。适合可插拔能力或边界明确的独立模块。

```tsx
const FeatureModule: Module = {
  setup(app) {
    app.provide([{ provide: FEATURE_FLAG, useValue: true }])
  },
}
```

两种方式可以组合使用：入口放全局基础能力，模块放领域内能力。  
涉及 `scope`、动态注册等高级 DI 策略，见 [深入依赖注入](./dependency-injection-in-depth.md)。

## 应用销毁与资源清理

`destroy()` 的职责不只是“把页面移除”，更重要的是触发应用级清理链路，特别是模块的 `onDestroy()`。

通常在微前端子应用卸载、容器节点切换并替换应用实例、自动化测试 teardown 阶段这几类场景里，建议显式调用 `destroy()`。

如果模块里有副作用资源（事件订阅、计时器、网络连接），必须在 `onDestroy()` 对应清理，避免内存泄漏和重复副作用。

## 常见误用与排错

### 1) 症状：重复 `mount` 报启动错误

同一应用实例只能启动一次。修复方式是销毁旧实例并重新 `createApp(...)`，或直接创建新实例。

### 2) 症状：状态变了但页面不刷新

这通常是因为使用了 `autoUpdate: false`，但没有手动调用 `app.render()`。修复方式是在状态变更后显式调用 `render()`，或改回自动更新模式。

### 3) 症状：切换页面/卸载后仍有订阅或日志输出

这通常是因为模块在 `setup` / `onAfterStartup` 建立了副作用，但没有在 `onDestroy` 清理。把订阅解绑、计时器清除、连接关闭逻辑补到 `onDestroy()` 即可。

## 下一步

- [深入依赖注入](./dependency-injection-in-depth.md)
- [路由](./router.md)
- [作用域样式](./styling/scoped-css.md)
