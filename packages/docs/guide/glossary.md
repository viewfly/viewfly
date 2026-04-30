# 术语表

| 术语 | 含义 |
|------|------|
| **setup** | 常指**组件主体**：组件声明函数里只在创建时执行一次的那段逻辑，用于声明响应式状态、注册生命周期钩子等。 |
| **渲染函数** / **组件渲染函数** | **组件主体**返回的函数（或返回对象上的 **`render`**），每次视图刷新时调用，用于生成本次的 `JSX`。 |
| **`reactive`** | 将对象转为响应式代理；属性读写可被收集为视图依赖。 |
| **`createSignal` / signal 实例** | `createSignal(initial)` 创建一类通过函数读写的响应式状态；实例调用 `signal()` 读取，`signal.set(v)` 写入。 |
| **`computed`** | 根据依赖自动缓存的计算值，通过 **`.value`** 读取。 |
| **`watch` / `watchEffect`** | 响应依赖变化执行回调或副作用；组件卸载时可自动清理（见 [响应式](./essentials-reactivity.md)）。 |
| **`createApp`** | 创建浏览器应用实例（由 **`@viewfly/platform-browser`** 导出）。 |
| **`mount` / `destroy`** | 将应用挂到 `DOM` 节点 / 卸载并清理。 |
| **`Provider` / `inject`** | 依赖注入：上层提供值，子组件通过 **`inject`** 获取（见 [依赖注入](./dependency-injection.md)）。 |
| **`RouterModule` / `RouterOutlet` / `Link`** | **`@viewfly/router`** 提供的应用模块、出口组件与声明式链接（见 [路由](./router.md)）。 |
| **`withMark`** | 为组件渲染创建的节点附加自定义 `DOM` 属性，常与 scoped 样式配合（见 [作用域样式](./styling/scoped-css.md)）。 |
