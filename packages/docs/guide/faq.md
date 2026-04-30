# 常见问题

## JSX 报错或 `jsxImportSource` 未指向 Viewfly

请确认 `tsconfig.json` 中 **`jsx`** 为 **`react-jsx`**，且 **`jsxImportSource`** 为 **`@viewfly/core`**。使用 Babel 时，**`@babel/preset-react`** 的 **`importSource`** 须同样指向 **`@viewfly/core`**。

## 依赖注入不生效或报 reflect-metadata 相关错

确保从 **`@viewfly/core` 主入口**导入以初始化元数据；若拆包后仍异常，在应用入口**第一行**增加：

```ts
import 'reflect-metadata'
```

## 路由跳转与路径参数、查询参数分不清

编程式导航 **`navigateTo(path, queryParams?, hash?)`** 的第二参是**查询对象**；路径上的动态段与 **`Router.params`**、**`useParams()`** 等请查阅 **`@viewfly/router`** 类型定义。

日常页面开发里，优先使用 **`useParams()`** 和 **`useQueryParams()`** 读取参数；`Router.params` 更适合路由基础设施或底层封装场景。

## 如何反馈问题

欢迎到 [GitHub Issues](https://github.com/viewfly/viewfly/issues) 反馈。
