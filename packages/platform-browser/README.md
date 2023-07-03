Viewfly
================================

Viewfly 是一个简单、数据驱动的前端框架。此项目为内核运行在浏览器上的支持层。

## 安装

```
npm install @viewfly/platform-browser
```

## API

### createApp()

createApp 用于创建一个独立的应用。

```js
import { createApp } from '@viewfly/platform-browser'

function App() {
  return () => {
    return <div>App!</div>
  }
}

const app = createApp(document.getElementById('app'), <App/>)

// 销毁 app 实例
app.destroy()
```

### fork()

可以在任意组件内创建一个子应用，并可以继承当前组件的上下文（特指当前组件的依赖注入树），常用于创建一个弹窗或对话框。

```jsx
function App() {
  function Modal() {
    return () => {
      return <div>modal</div>
    }
  }
  // 创建子应用
  const childApp = fork(<Modal/>)
  // 启动子应用
  childApp.mount(document.getElementById('modal'))
  // 销毁子应用
  childApp.destroy()

  return () => {
    return <div>App!</div>
  }
}
```

完整文档请参考官方网站：[viewfly.org](https://viewfly.org)
