<h1 align="center"><img src="./_source/logo.svg" alt="Viewfly" width="60px" align="center"> Viewfly</h1>

<p align="center">🚀 一个简单、易上手、数据驱动的前端框架。</p>

<p align="center">
  <img src="https://img.shields.io/badge/build-passing-green" alt="version:2.5.7">
  <img src="https://img.shields.io/badge/version-0.0.7-red">
  <img src="https://img.shields.io/badge/npm-published-blue">
  <img src="https://img.shields.io/badge/unit test-100%25-deep green">
</p>

为什么要开发 Viewfly？现在前端开发基本都围绕三大框架，也有一些更多的新星框架在圈内引起了大量关注，要在这种基础之上再推陈出新，无疑是非常困难的事情。

不过，它们都太复杂了，有的创建组件要写很多样板代码，有的需要特殊的语法或编译，有的不方便与 TypeScript 集成，有的有闭包陷阱等等。这给了 Viewfly 推出的契机。

我们要的是**简单、简单、还是简单！**


## 官方文档

[viewfly.org](https://viewfly.org)

## 安装

### 通过 cli 安装

```
npm install @viewfly/cli -g
```
在命令行输入如下命令，并根据自己的需要选择模板
```
viewfly new myApp
```

### 通过 npm 直接安装
```
npm install @viewfly/core @viewfly/platform-browser
```
## 创建应用

在 DOM 中准备好一个空的标签
```html
<div id="app"></div>
```
创建应用组件

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

## Viewfly 的特点

+ **函数组件**： Viewfly 全面拥抱函数，简单易学
+ **性能优异**： 在 js-framework-benchmark 基本测试中，性能超过 React 和 Angular
+ **上手简单**： Viewfly 没有 hook 规则，没有闭包陷阱，完全符合直觉
+ **支持 IoC**： 支持完整的依赖注入能力，更方便做架构分开和单元测试
+ **类型安全**： Viewfly 完全用 TypeScript 开发，没有任何自创语法或黑魔法
+ **轻量**： Core + Browser 模块在 minify + gzip 只有 12 KB

## 赞助

如果你愿意支持 Viewfly 的发展，同时鼓励我们做的更好，欢迎通过下面的二维码表达你的支持

![](./_source/wx.jpg) ![](./_source/alipay.jpg)

## License

Viewfly 遵循 MIT 开源协议。
