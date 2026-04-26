# @viewfly/platform-browser

在**浏览器**中运行 Viewfly 应用的入口包：提供根应用的创建、挂载、销毁等与 DOM 相关的能力。

使用前请已安装并配置好 **`@viewfly/core`**（含 JSX 与 `reflect-metadata` 等约定）。

---

## 安装

```bash
pnpm add @viewfly/platform-browser @viewfly/core
```

---

## 创建并挂载应用

在 HTML 中准备挂载点，例如：

```html
<div id="app"></div>
```

在脚本中：

```tsx
import { createApp } from '@viewfly/platform-browser'

function App() {
  return () => <div>Hello Viewfly</div>
}

const app = createApp(<App />)
app.mount(document.getElementById('app')!)

// 需要时卸载并清理
app.destroy()
```

---

具体 API 以类型定义与官网说明为准。

---

## 文档

- 以 **`@viewfly/platform-browser` 类型定义** 与本仓库内说明为准；第三方文档可能未及时更新。

---

## License

MIT
