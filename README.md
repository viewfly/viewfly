Viewfly
===================================================

一个简单、高性能的前端框架。

## 安装
```
# 还未发布
```

## 使用示例
```jsx
import { useSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

function App() {
  const number = useSignal(0)

  return () => {
    return (
      <div>
        <div>{number()}</div>
        <div>
          <button type="button" onClick={() => {
            number.set(number() + 1)
          }
          }>点我加 1</button>
        </div>
      </div>
    )
  }
}

createApp(<App/>, document.getElementById('app'))
```
