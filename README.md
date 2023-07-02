<h1 align="center"><img src="./logo.svg" alt="Viewfly" width="60px" align="center"> Viewfly <sup>内测版</sup></h1>

<p align="center">🚀 一个简单、易上手、数据驱动的前端框架。</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green" alt="version:2.5.7">
  <img src="https://img.shields.io/badge/npm-0.0.1 alpha-red">
  <img src="https://img.shields.io/badge/unit test-100%25-deep green">
  <img src="https://img.shields.io/badge/QQ Group-855433615-blue" alt="qq group:">
</p>

为什么要开发 Viewfly？现在前端开发基本都围绕三大框架，也有一些更多的新新框架在圈内引起了大量关注，要在这种基础之上再推陈出新，无疑是非常困难的事情。

不过，它们都太复杂了，有的创建组件要写很多样板代码，有的需要特殊的语法或编译，有的不方便与 TypeScript 集成，有的有闭包陷阱等等。这给了 Viewfly 推出的契机。

我们要的是**简单、简单、还是简单！**


## 官方文档

[viewfly.org](https://viewfly.org)

## 安装

通过 npm 安装
```
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

createApp(document.getElementById('app'), <App/>)
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

### useSignal()

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

### useRef()
获取 DOM 节点

```tsx
import { useRef } from '@viewfly/core'

function App() {
  const ref = useRef(node => {
    function fn() {
      // do something...
    }
    node.addEventListener('click', fn)
    // 可选返回一个回调函数，会在元素销毁时调用
    return () => {
      node.removeEventListener('click', fn)
    }
  })
  return () => {
    return <div ref={ref}>xxx</div>
  }
}
```

### useEffect()

监听数据变更

```tsx
import { useSignal, useEffect } from '@viewfly/core'

functino App() {
  const count = useSignal(1)

  function increment() {
    count.set(count() + 1)
  }

  useEffect(count, () => {
    // do something...
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

### useDerived()

监听一组 Signal，并派生出一个新的 Signal。

```js
import { useSignal, useDerived } from '@viewfly/core'

const sA = useSignal(1)
const sB = useSignal(2)

const sC = useDerived(() => {
  return sA() + sB()
})

console.log(sC()) // 3

sA.set(2)

console.log(sC()) // 4
```

大多数情况下，我们不需要使用 `useDerived`，我们更推荐直接使用一个函数求值即可。如：

```js
const sC = function() {
  return sA() + sB()
}

console.log(sC())
```
直接用函数求值，性能更好，只有确实需要一把一组 Signal 组装成一个新的 Signal 时，再使用 `useDerived`。

## 生命周期

### onMounted()

当组件挂后调用

```tsx
import { onMounted } from '@viewfly/core'

functino App() {
  onMounted(() => {
    console.log('App mounted')
    // 可选返回一个回调函数，会在组件销毁时调用
    return () => {
      console.log('App destroyed')
    }
  })
  return () => {
    return (
      <div>App Content</div>
    )
  }
}
```

### onUpdated()

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
    // 可选返回一个回调函数，会在组件下一次更新时调用
    return () => {
      console.log('组件即将开始下一轮更新')
    }
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

### onPropsChanged()

当 props 发生变化时调用

```tsx
import { useSignal, onPropsChanged } from '@viewfly/core'

function Child(props) {
  onPropsChanged((currentProps, oldProps) => {
    console.log(currentProps, oldProps)
    // 可选返回一个回调函数，会在组件下一次更新 props 时调用
    return () => {
      console.log('组件 props 即将变更')
    }
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

### onDestroy()

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

### 数据透传

Viewfly 支持完整的依赖注入能力，并支持完善的类型推断，普通数据可以通过以下方式共享。要完整使用依赖注入能力，需要 TypeScript 支持，你需要在 tsconfig.json 中添加如下配置，使用文档可参考 [@tanbo/di](https://github.com/tbhuabi/di)：

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
  }
}
```

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
