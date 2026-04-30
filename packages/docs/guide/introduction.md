# 简介

Viewfly 是一个**数据驱动**的 `JavaScript` 框架，提供一套**简单、符合直觉**的 API，帮助你高效构建富交互的用户界面。

> Viewfly 提倡**回归原生 JavaScript，不创建特殊语法，不改变 JavaScript 语义，不依赖特殊的编译环境**，并坚持用我们熟悉的语法来完成应用的开发。

一个最简单的示例如下：

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({
  count: 0
})

function App() {
  return () => <div>{model.count}</div>
}

setInterval(() => model.count++, 1000)

createApp(<App/>).mount(document.getElementById('app'))
```

## 为什么选择 Viewfly

如果你是一位经验丰富的前端开发者，我相信你也会和我们一样遇到相同的问题。有的前端框架太重，创建一个组件的样板代码过多；有的不符合直觉，有闭包陷阱；有的有太多和社区割裂的自创语法，不能很好的和其它类库结合；有的有太多自己的主张，侵入性太严重；有的对 TypeScript 支持不友好等等。

如今，前端真的是太重了，学习一个框架就像学习一门新语言一样。

我们相信，只使用普通的 JavaScript 一样可以编写出高质量、可维护、简单且容易扩展的代码。这也是我开发 Viewfly 的初衷。

Viewfly 充分吸收了现有前端框架的一些优点，并在开发者使用层面有所体现，有：

- **响应式与副作用** ——reactive、createSignal、watch 等所有 hook 都可以在组件外使用，这让我们可以更灵活的组织组件和数据。
- **JSX** —— JSX 是 React 发明的一种声明式 UI 描述语言，其灵活的编写方式，丰富的表达能力，现在被大多数前端框架所采用，基本已成为前端 UI 描述语言的通用解决方案。
- **函数组件** —— 函数组件因其创建简单，使用灵活，备受前端开发人员青睐。
- **依赖注入** —— 依赖注入可以方便构建可拆分、可测试、架构健壮的应用。
- **`createSignal` / `reactive`** —— 灵活的响应式风格，有利于适应更复杂的需求，构建大型应用。
- **TypeScript 兼容** —— 由于 Viewfly 的组件本质是一堆函数，所以可以无缝和 TypeScript 集成，方便你写出类型安全的代码。

## 文档说明

本文档用于说明当前 Viewfly 的公开能力与推荐用法。若你在使用过程中发现示例、类型提示与实际行为不一致，请通过 [GitHub Issues](https://github.com/viewfly/viewfly/issues) 反馈，我们会及时修正文档或在发布中说明变更。

## 下一步

- [安装与配置](./installation.md)
- [快速上手](./quick-start.md)
- [创建应用](./essentials-application.md)
