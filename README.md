<h1 align="center">Viewfly <sup>内测版</sup></h1>

🚀 Viewfly 是一个简单、数据驱动的前端视图库。在遍地前端框架的年代，为什么还要造一个新的呢？我们觉得现有的前端框架都太复杂了，有的创建组件要写很多样板代码，有的需要特殊的语法或编译，有的不方便与 TypeScript 集成，有的有闭包陷阱等等。

能找的理由太多了，我们要的是**简单、简单、还是简单！**

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green" alt="version:2.5.7">
  <img src="https://img.shields.io/badge/npm-no publish-red">
  <img src="https://img.shields.io/badge/QQ Group-855433615-blue" alt="qq group:">
</p>


## 官方文档

[viewfly.org](https://viewfly.org)

## 安装

通过 npm 安装
```
# 还未发布
npm install @viewfly/core @viewfly/platform-browser
```
在 DOM 中准备好一个空的标签
```html
<div id="app"></div>
```

创建应用

```tsx
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
            }}>
            点我加 1
          </button>
        </div>
      </div>
    )
  }
}

createApp(document.getElementById('app'), () => <App/>)
```

## 环境配置

Viewfly 官方脚手架正在开发中，当前你可以通过在 tsconfig.json 中添加 tsx 编辑配置即可

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@viewfly/core"
  }
}
```

## Hooks

### useSignal 

状态管理

```tsx
import { useSignal } from '@viewfly/core'

functino App() {
  const count = useSignal(1)
  
  function increment() {
    count.set(count() + 1)
  }
  return () => {
    return (
      <div>
        <div>count: {count()}</div>
        <button type="button" onClick={increment}>点我加 1</button>
      </div>
    )
  }
}
```

### onMount

当组件挂后调用

```tsx
import { onMount } from '@viewfly/core'

functino App() {
  onMount(() => {
    console.log('App mounted')
  })
  return () => {
    return (
      <div>App Content</div>
    )
  }
}
```

### onUpdated

当组件视图更新后调用

```tsx
import { useSignal, onUpdated } from '@viewfly/core'

functino App() {
  const count = useSignal(1)
  
  function increment() {
    count.set(count() + 1)
  }
  
  onUpdated(() => {
    console.log('App updated')
  })
  return () => {
    return (
      <div>
        <div>count: {count()}</div>
        <button type="button" onClick={increment}>点我加 1</button>
      </div>
    )
  }
}
```

### onPropsChanged

当 props 发生变化时调用

```tsx
import { useSignal, onPropsChanged } from '@viewfly/core'

function Child(props) {
  onPropsChanged((currentProps, oldProps) => {
    console.log(currentProps, oldProps)
  })
  return () => {
    return (
      <div data-parent-count={props.count}>{porps.children}</div>
    )
  }
}

functino App() {
  const count = useSignal(1)
  
  function increment() {
    count.set(count() + 1)
  }
  return () => {
    return (
      <div>
        <div>count: {count()}</div>
        <Child count={count()}>text from parent!</Child>
        <button type="button" onClick={increment}>点我加 1</button>
      </div>
    )
  }
}
```

### onDestroy

当组件销毁时调用

```tsx
import { onDestroy } from '@viewfly/core'

functino App() {
  onDestroy(() => {
    console.log('App destroyed')
  })
  return () => {
    return (
      <div>App Content</div>
    )
  }
}
```



### useRef
获取 DOM 节点

```tsx
import { useRef, onMount } from '@viewfly/core'

functino App() {
  const ref = useRef()
  onMount(() => {
    console.log(ref.current)
  })
  return () => {
    return (
      <div ref={ref}>App Content</div>
    )
  }
}
```

### 数据透传

Viewfly 支持完整的依赖注入能力，并支持完善的类型推断，普通数据可以通过以下方式共享。

```tsx
import { provide, inject, InjectionToken } from '@viewfly/core'

interface User {
  name: string
  age: number
}

const userInjectionToken = new InjectionToken<User>('User')

function Child(props) {
  const user = inject(userInjectionToken)
  return () => {
    return (
      <div>
        <div>用户名：{user.name}</div>
        <div>年龄：{user.age}</div>
        <div>
          {porps.children}
        </div>
      </div>
    )
  }
}

functino App() {
  provide({
    provide: userInjectionToken,
    useValue: {
      name: '张三',
      age: 22
    }
  })

  return () => {
    return (
      <div>
        <Child>text from parent!</Child>
      </div>
    )
  }
}
```

## 路由

正在开发中...
