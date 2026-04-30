# 生命周期

生命周期钩子解决的是“同一段逻辑应该在什么时候运行”。在组件里，你通常会关心三件事：首次挂载后做初始化、每次更新后做同步、卸载时做清理。对应到 Viewfly，就是 `onMounted`、`onUpdated`、`onUnmounted`。

这三个钩子都要放在**组件主体**调用，不要写进**渲染函数**。

## 调用位置：组件主体

先看一个最小示例。下面的 `onMounted` 调用位置是正确的：它在组件主体里，而不是在 `return () => ...` 的渲染函数里。

```tsx
import { reactive, onMounted } from '@viewfly/core'

function App() {
  const model = reactive({ count: 0 })

  // 正确：在组件主体调用
  onMounted(() => {
    console.log('mounted')
  })

  return () => <button onClick={() => model.count++}>{model.count}</button>
}
```

## `onMounted`

`onMounted` 会在组件挂载到 DOM 后执行。常见用途是绑定事件监听、启动定时器、初始化第三方实例。

`onMounted` 的回调可以返回一个清理函数，这个清理函数会在组件销毁前执行。

```tsx
import { onMounted } from '@viewfly/core'

function App() {
  onMounted(() => {
    const onResize = () => {
      console.log(window.innerWidth)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
    }
  })
  return () => <div>App</div>
}
```

这个写法适合“创建即清理成对出现”的场景：绑定了什么，就在返回函数里解绑什么。

## `onUpdated`

`onUpdated` 会在组件完成一次视图更新后执行。它适合做“界面更新完成后再做”的同步动作，例如更新 `document.title`、上报变化或读取更新后的 DOM 状态。

```tsx
import { reactive, onUpdated } from '@viewfly/core'

function App() {
  const model = reactive({ q: '' })

  onUpdated(() => {
    document.title = model.q ? `搜索：${model.q}` : '搜索页'
  })

  return () => (
    <input
      value={model.q}
      onInput={e => {
        model.q = (e.target as HTMLInputElement).value
      }}
    />
  )
}
```

`onUpdated` 也支持返回清理函数。下一次更新到来前，会先执行上一次返回的清理逻辑，这在防抖、取消上一次任务时很有用。

```tsx
import { reactive, onUpdated } from '@viewfly/core'

function SearchPanel() {
  const model = reactive({ q: '' })

  onUpdated(() => {
    const timer = setTimeout(() => {
      console.log('sync keyword:', model.q)
    }, 200)

    // 下一次更新前会先执行这里，避免重复副作用
    return () => clearTimeout(timer)
  })

  return () => (
    <input
      value={model.q}
      onInput={e => {
        model.q = (e.target as HTMLInputElement).value
      }}
    />
  )
}
```

## `onUnmounted`

`onUnmounted` 会在组件销毁时执行，常用于取消订阅、清理定时器、销毁外部实例等“兜底清理”动作。

```tsx
import { onMounted, onUnmounted } from '@viewfly/core'

function Clock() {
  let timer: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    timer = setInterval(() => {
      console.log('tick')
    }, 1000)
  })

  onUnmounted(() => {
    if (timer) {
      clearInterval(timer)
    }
  })

  return () => <div>Clock</div>
}
```

## 组合示例：初始化、更新、销毁

下面把三个钩子放在同一个组件里，方便对照整个生命周期流程：挂载时记录日志，更新时做防抖同步，卸载时清掉未完成的定时器。

```tsx
import { reactive, onMounted, onUpdated, onUnmounted } from '@viewfly/core'

function SearchPanel() {
  const model = reactive({ q: '' })
  let timer: ReturnType<typeof setTimeout> | null = null

  onMounted(() => {
    console.log('panel mounted')
  })

  onUpdated(() => {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      console.log('sync keyword:', model.q)
    }, 200)
  })

  onUnmounted(() => {
    if (timer) {
      clearTimeout(timer)
    }
  })

  return () => (
    <input
      value={model.q}
      onInput={e => {
        model.q = (e.target as HTMLInputElement).value
      }}
    />
  )
}
```

## 常见注意点

### 1) 在渲染函数里调用钩子（错误）

这个错误的本质是：渲染函数会反复执行，钩子注册必须是稳定的一次性流程，应该放在组件主体。

```tsx
import { reactive, onMounted } from '@viewfly/core'

function BadCase() {
  const model = reactive({ count: 0 })
  return () => {
    onMounted(() => {
      console.log('mounted')
    })
    return <button onClick={() => model.count++}>{model.count}</button>
  }
}
```

改法：把 `onMounted`、`onUpdated`、`onUnmounted` 放到组件主体里调用。

### 2) 忘记清理副作用

如果你在 `onMounted` 里绑定了事件、创建了定时器或第三方实例，却没有在清理阶段释放，组件多次挂载/卸载后就容易出现重复监听和内存泄漏。常见改法是：要么让 `onMounted` 返回清理函数，要么在 `onUnmounted` 里显式清理。

---

更多钩子与参数细节，以 `@viewfly/core` 中 lifecycle 相关导出和类型定义为准。

## 下一步

- [依赖注入](./dependency-injection.md)
- [应用深入](./application-in-depth.md)
