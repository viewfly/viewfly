Viewfly
================================

Viewfly 是一个简单、数据驱动的前端视图库。此包为 Viewfly 组件提供了 css 模块化的能力。

要使用 css 模块化能力，还需要在 webpack 配置中 css loader 的模块化支持，具体可参考相关文档。

## 安装
```
npm install @viewfly/scoped-css
```

## API

### scopedCSS()

```css
/* app.module.css */
.app {
  color: blue
}
```

```jsx
import { scopedCSS } from '@viewfly/scoped-css'

import css from './app.module.css'

const App = scopedCSS(css, () => {
  return () => {
    return <div css="app">App</div>
  }
})
```

scopedCSS 通过会识别标签的 css 属性，并替换为模拟化的 css class 类名。css 不仅可以支持字符串，还可以支持对象、数组、或数组内对象的组合。


完整文档请参考官方网站：[viewfly.org](https://viewfly.org)
