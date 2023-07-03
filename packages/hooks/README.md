Viewfly
================================

Viewfly 是一个简单、数据驱动的前端框架。此项目在内核的基础上，封装了更为简单、强大 hook 扩展。


## 安装

```
npm install @viewfly/hooks
```

## API

### useProduce()

useProduce 为 Viewfly 管理复杂对象提供了更方便的操作方式。其底层采用 [immer](https://github.com/immerjs/immer)。使用方式如下：

```js
import { useProduce } from '@viewfly/hooks'

const [signal, update] = useProduce({
  name: 'Bob',
  age: 25
})

// 获取数据
console.log(signal().name) // Bob

// 更新数据
update(draft => {
  draft.name = 'Jack'
})

console.log(signal().name) // Jack
```

完整文档请参考官方网站：[viewfly.org](https://viewfly.org)
