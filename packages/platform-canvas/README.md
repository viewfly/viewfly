Viewfly
================================

Viewfly 是一个简单、数据驱动的前端框架。此项目为内核运行在Canvas 上的支持层。

## 安装

```
npm install @viewfly/platform-canvas
```

## API

### createApp()

createApp 用于创建一个独立的应用。

```js
import { createApp } from '@viewfly/platform-browser'

function App() {
  return () => {
    return <view>App!</view>
  }
}

const app = createApp(<App/>)
app.mount(document.getElementById('app'))

// 销毁 app 实例
app.destroy()
```

完整文档请参考官方网站：[viewfly.org](https://viewfly.org)
