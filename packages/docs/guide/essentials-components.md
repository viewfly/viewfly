# JSX 与组件

本页会带你把 `JSX` 与函数组件最常用的写法串起来，包括 `props`、父子通信、DOM 事件、`style`、`class`、`ref` 和 `Portal`。阅读前建议先跑通 [快速上手](./quick-start.md) 或 [创建应用](./essentials-application.md)，并完成 [安装与配置](./installation.md) 里的 `jsxImportSource` 配置。

## 从 JSX 到界面：一棵视图树

你可以把 JSX 理解成“界面树的描述语言”。像 `<div>`、`<button>` 这样的内置标签最终会落到真实 DOM；像 `<Counter />` 这样首字母大写的标签表示组件节点，会在运行时展开成一段子界面。标签里的子内容，无论是普通 JSX 还是 `{表达式}`，都会作为子节点参与父级布局。

嵌套关系可理解为：

```text
App
├── Header
└── Main
    └── Counter
```

## 函数组件的两段式

Viewfly 用**一个函数**描述组件：创建时会先执行**组件主体**（**`return` 之前**的这一段，只跑一次，类型与资料里也常叫 **setup**），用来放 **`reactive` / `createSignal`**、**`onMounted`**、**`watch`** 等。

**返回值**用来描述“当前这一帧该怎么渲染”。常见有两种形态：一种是直接返回渲染函数，刷新时框架会再次调用它来拿到最新 JSX；另一种是返回带 `render()` 的对象，刷新时调用 `render()`，同时你也可以在这个对象上暴露方法给父组件通过 `ref` 调用。

下文示例采用「**返回渲染函数**」写法；对象形态的细节与边界这里不展开。

```tsx
import { reactive } from '@viewfly/core'

function Counter() {
  const state = reactive({ count: 0 })
  return () => (
    <button type="button" onClick={() => state.count++}>
      {state.count}
    </button>
  )
}
```

在其它组件里写 **`<Counter />`** 即可使用子组件。

**组件主体与渲染函数**

组件主体主要负责一次性的初始化逻辑，`onMounted`、`watch` 等都要放在这里（见 [生命周期](./lifecycle.md)）。而真正会随刷新反复执行的是渲染函数（或对象形态里的 `render`）。如果某个响应式状态只在组件主体读取、渲染阶段完全不读，界面通常不会随它变化。

状态与副作用的完整写法见 [响应式](./essentials-reactivity.md)。

## props（父传入属性）

组件函数的第一个参数就是 **`props`**，用于接收父组件传入的数据：

```tsx
function Hello(props: { name: string }) {
  return () => <p>你好，{props.name}</p>
}
```

父组件使用方式：

```tsx
<Hello name="Viewfly" />
```

### 用 TypeScript 标注 props

在 TypeScript 项目里，建议为 `props` 单独声明类型（接口或类型别名），明确必填与可选字段：

```tsx
interface HelloProps {
  name: string
  desc?: string
}

function Hello(props: HelloProps) {
  return () => (
    <p>
      {props.name}
      {props.desc ? ` - ${props.desc}` : ''}
    </p>
  )
}
```

### `props` 不要解构

`props` 建议始终通过 `props.xxx` 访问。若在组件主体直接解构，解构变量会失去响应性语义，后续 `props` 变化可能不会反映到界面或监听逻辑中。

```tsx
// 错误：解构后容易失去响应性语义
function BadUserCard(props: { userId: string }) {
  const { userId } = props
  return () => <div>{userId}</div>
}

// 正确：保持 props.userId 访问
function GoodUserCard(props: { userId: string }) {
  return () => <div>{props.userId}</div>
}
```

### 监听 props 变化

当你需要在 `props` 变化时执行副作用（例如重新请求、埋点、日志），可在组件主体里使用 `watch`：

```tsx
import { watch } from '@viewfly/core'

function UserCard(props: { userId: string }) {
  watch(
    () => props.userId,
    (nextId, prevId) => {
      console.log('userId changed:', prevId, '->', nextId)
    },
  )

  return () => <div>当前用户：{props.userId}</div>
}
```

这里可以记一个简单原则：`watch` 放在组件主体，监听源里明确读取目标字段（例如 `() => props.userId`），只有在确实需要副作用时才监听；如果只是展示，直接在渲染里读取 `props` 就够了。

## 组件通信（父子）

父子通信最常见的是“向下传数据、向上发通知”这两个方向。

```text
父组件
├── 向下：通过 props 传数据、传配置
└── 向上：通过 props 传入「回调函数」，子组件在适当时机调用，把结果传回父组件
```

向下传递时，父组件把数据放进 `props`，子组件直接读取并渲染。向上通知时，父组件把回调函数通过 `props` 传给子组件，子组件在合适时机调用它（如 `props.onSave?.(payload)`）。如果父组件把 JSX 写在子组件标签对之间，这部分内容会通过 `props.children` 进入子组件，你可以把它渲染到任何你想放的位置。

```tsx
import type { JSXNode } from '@viewfly/core'

function Panel(props: { title: string; children?: JSXNode }) {
  return () => (
    <section class="panel">
      <h2>{props.title}</h2>
      <div class="panel-body">{props.children}</div>
    </section>
  )
}

function App() {
  return () => (
    <Panel title="设置">
      <p>这里的内容会出现在 Panel 的 body 里</p>
    </Panel>
  )
}
```

更复杂的跨层共享见 [依赖注入](./dependency-injection.md)。

## Portal（渲染到外部容器）

`Portal` 用于把一段子节点渲染到当前组件树以外的目标容器，常见于弹窗、抽屉、全局浮层等场景。

```tsx
import { Portal } from '@viewfly/core'

function App() {
  const modal = document.getElementById('modal-root')
  if (!modal) {
    throw new Error('缺少 #modal-root 挂载点')
  }

  return () => (
    <div>
      <h1>页面主体</h1>
      <Portal container={modal}>
        <div class="dialog">这是渲染在 modal-root 内的内容</div>
      </Portal>
    </div>
  )
}
```

页面结构示例：

```html
<div id="app"></div>
<div id="modal-root"></div>
```

使用 `Portal` 时要注意三点：`container` 必须是已存在的真实 DOM 节点；`Portal` 只改变渲染位置，不改变组件在逻辑树中的归属；弹窗这类场景通常还会配合状态来控制显示和隐藏。

## 事件

内置元素使用 **`on` + 事件名（首字母大写）** 的 **`JSX`** 写法，值为处理函数。函数会收到与浏览器一致的 **`DOM`** 事件对象（具体类型以 **`TypeScript` 与 `@viewfly/platform-browser` 的类型**为准）。

```tsx
function Form() {
  const state = reactive({ text: '' })
  return () => (
    <div>
      <input
        type="text"
        value={state.text}
        onInput={e => {
          state.text = (e.target as HTMLInputElement).value
        }}
      />
      <button type="button" onClick={() => console.log(state.text)}>
        提交
      </button>
    </div>
  )
}
```

需要时在处理函数里调用 **`e.preventDefault()`**、**`e.stopPropagation()`** 等与原生事件相同。

## style（样式）

内置元素上的 `style` 既可以写成字符串，也可以写成对象。字符串写法和 HTML `style` 属性类似；对象写法里，键是 CSS 属性名（可用驼峰），值可以是字符串或数字。和响应式状态搭配时，只要在渲染函数里读取最新值，就能按状态动态切换样式（见 [响应式](./essentials-reactivity.md)）。

```tsx
function Box() {
  const model = reactive({ wide: true })
  return () => (
    <div
      style={{
        width: model.wide ? '200px' : '100px',
        height: '40px',
        background: '#eee',
      }}
      onClick={() => (model.wide = !model.wide)}
    />
  )
}
```

## class（类名）

内置元素上的 `class` 用来控制 DOM 的类名列表。常见写法有字符串、对象和数组，也可以嵌套组合。

```text
class 可以怎么写？
├── 字符串：一个或多个 class 名（空格分隔）
├── 数组：按顺序把每一段「展开」再拼成最终类名列表
├── 对象：键表示候选 class 名；值为「真」的键会出现在元素上
└── 数组里套对象 / 再套数组：适合按条件开关多组 class
```

对象写法里，值为 `true` 的键会出现在类名里；数组写法可以混用字符串、对象和子数组。需要随状态变化时，在渲染函数里按当前状态拼出对应结构即可。

```tsx
<div class={{ box: false, box1: true }} />

<div class={['box', { box1: true, box2: false }]} />

function Box() {
  const model = reactive({ active: false })
  return () => (
    <div
      class={['box', { active: model.active }]}
      onClick={() => (model.active = !model.active)}
    />
  )
}
```

其它常见 **`HTML`** 属性（**`id`**、**`disabled`**、**`data-*`** 等）按 **`JSX`** 与 **`@viewfly/platform-browser`** 的类型提示书写即可；**`SVG`** 等命名空间下的差异也以类型为准。

## 组合与职责拆分

实践中建议先按界面区域拆分函数组件，再通过 `props` 与 `children` 组合。这样可读性和可测试性都会更好。只有在父子两层已经不足以表达依赖关系时，再引入 [依赖注入](./dependency-injection.md) 或更上层的状态方案，避免过早堆叠全局单例。

## ref（获取 DOM 或子组件实例）

当你已经掌握组件、`props` 与常见事件写法后，再引入 `ref` 会更顺手。`ref` 用于在组件主体中拿到绑定节点或子组件实例。常见两种方式是 `createRef<T>()` 和 `createDynamicRef<T>(fn)`：前者通过 `ref.value` 读取实例，后者在实例可用时立即触发回调。

### `createRef`：父组件调用子组件暴露方法

```tsx
import { createRef, onMounted } from '@viewfly/core'

function Child() {
  return {
    focus() {
      console.log('child focus')
    },
    render() {
      return <div>Child</div>
    },
  }
}

function Parent() {
  const childRef = createRef<typeof Child>()

  onMounted(() => {
    childRef.value?.focus()
  })

  return () => <Child ref={childRef} />
}
```

### `createRef`：获取 DOM 节点

```tsx
import { createRef, onMounted } from '@viewfly/core'

function App() {
  const inputRef = createRef<HTMLInputElement>()

  onMounted(() => {
    inputRef.value?.focus()
  })

  return () => <input ref={inputRef} />
}
```

### `createDynamicRef`：实例可用时立即执行副作用

```tsx
import { createDynamicRef } from '@viewfly/core'

function App() {
  const inputRef = createDynamicRef<HTMLInputElement>(node => {
    node.focus()
    const onFocus = () => console.log('focused')
    node.addEventListener('focus', onFocus)

    // 节点销毁时执行清理
    return () => node.removeEventListener('focus', onFocus)
  })

  return () => <input ref={inputRef} />
}
```

### `createDynamicRef`：获取子组件实例

```tsx
import { createDynamicRef } from '@viewfly/core'

function Child() {
  return {
    open() {
      console.log('open child panel')
    },
    render() {
      return <div>Child Panel</div>
    },
  }
}

function Parent() {
  const childRef = createDynamicRef<typeof Child>(instance => {
    instance.open()
    return () => {
      console.log('child ref disposed')
    }
  })

  return () => <Child ref={childRef} />
}
```

使用 `ref` 时通常把 `ref.value` 的读取放在 `onMounted` 或后续事件里。组件 `ref` 拿到的是子组件返回对象（如果子组件只返回渲染函数，就不会有自定义方法可调用）。当你希望“实例一出现就执行副作用”时，`createDynamicRef` 会更合适。

## 注意点

事件处理函数写成主体中可复用的函数，通常会更清晰；继续使用内联函数（如 `onClick={() => ...}`）一般也没有问题。真正要避免的是把响应式数据在组件主体里读成一次性快照，然后在渲染阶段长期使用，导致界面显示旧值。另外，`onMounted`、`watch` 这类 hooks 必须放在组件主体，不要放进渲染函数（见 [生命周期](./lifecycle.md) 与 [响应式](./essentials-reactivity.md)）。

## 下一步

- [响应式](./essentials-reactivity.md)  
- [创建应用](./essentials-application.md)（回顾挂载与入口）
