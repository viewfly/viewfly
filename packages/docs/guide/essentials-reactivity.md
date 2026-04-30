# 响应式

响应式解决的是“数据变了，界面如何跟着变”。在 Viewfly 里，你会最常接触到 `reactive`、`createSignal`、`computed`、`watch` 和 `watchEffect`。这几个 API 可以理解成三层能力：先有可读写的状态，再有基于状态的派生值，最后是和副作用相关的监听。

## 最小示例：输入与显示同步

这个例子展示最核心的链路：输入框改动 `model.text`，渲染函数读取 `model.text`，界面立即反映最新值。

```tsx
import { reactive } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

const model = reactive({ text: 'Hello Viewfly' })

function App() {
  return () => (
    <div>
      <input
        value={model.text}
        onInput={e => {
          model.text = (e.target as HTMLInputElement).value
        }}
      />
      <p>当前输入：{model.text}</p>
    </div>
  )
}

createApp(<App />).mount(document.getElementById('app')!)
```

这里的关键点有两个。第一，`reactive` 负责把普通对象变成可追踪状态；第二，状态必须在渲染函数里被读取，框架才能知道“这个视图依赖了它”。

## 读写规则

写响应式代码时，可以先记住两条。第一，在渲染函数里读取状态，比如把 `model.text` 放到 JSX 中。第二，在事件或业务逻辑里写入状态，比如 `model.text = next`。

另外有一个容易踩坑的点：不要把“响应式对象变量本身”重新赋值到新对象，否则会丢失原来的响应式连接。

```tsx
function BadCase() {
  let model = reactive({ count: 0 })

  const reset = () => {
    // 错误：把变量本身指向了一个普通新对象
    model = { count: 0 }
  }

  return () => <button onClick={reset}>{model.count}</button>
}

function GoodCase() {
  const model = reactive({ count: 0 })

  const reset = () => {
    // 正确：在原响应式对象上改属性
    model.count = 0
  }

  return () => <button onClick={reset}>{model.count}</button>
}
```

## 常见写法

### 表单字段对象

当页面是“多个字段一起编辑”时，用一个 `reactive` 对象收拢状态会比较顺手。

```tsx
function ProfileForm() {
  const form = reactive({
    name: '',
    age: 18,
  })

  return () => (
    <section>
      <input
        value={form.name}
        onInput={e => {
          form.name = (e.target as HTMLInputElement).value
        }}
      />
      <button type="button" onClick={() => (form.age += 1)}>
        年龄 +1
      </button>
      <p>{form.name || '未填写'} / {form.age}</p>
    </section>
  )
}
```

这个写法的重点是把“显示值”和“写入动作”放在同一个字段上，例如 `form.name`。这样你回看代码时，很快就能对齐输入来源和渲染结果。

### 列表项状态切换

列表场景的常见操作是“按项更新”。下面的例子里，每个 `item.done` 都能独立切换。

```tsx
function TodoList() {
  const state = reactive({
    items: [
      { id: 1, text: '阅读文档', done: false },
      { id: 2, text: '写示例', done: true },
    ],
  })

  return () => (
    <ul>
      {state.items.map(item => (
        <li key={item.id}>
          <label>
            <input
              type="checkbox"
              checked={item.done}
              onInput={e => {
                item.done = (e.target as HTMLInputElement).checked
              }}
            />
            {item.text}
          </label>
        </li>
      ))}
    </ul>
  )
}
```

当你在 `map` 里直接更新当前项属性时，代码会比较直观；对应到业务上，就是“只改这一行，不影响其它行”。

### `shallowReactive`：只追踪第一层属性

`shallowReactive` 适合“只关心对象第一层字段变化”的场景。它和 `reactive` 一样是对象式状态，但不会把嵌套对象继续转成深层响应式对象。

```tsx
import { shallowReactive } from '@viewfly/core'

function UserPanel() {
  const state = shallowReactive({
    user: { name: 'A', age: 18 },
    version: 0,
  })

  return () => (
    <div>
      <p>
        {state.user.name} / v{state.version}
      </p>
      <button
        type="button"
        onClick={() => {
          // 直接改深层属性：不保证触发更新
          state.user.age += 1
        }}
      >
        年龄 +1（深层改动）
      </button>
      <button
        type="button"
        onClick={() => {
          // 替换第一层字段引用：会触发更新
          state.user = { ...state.user, age: state.user.age + 1 }
        }}
      >
        年龄 +1（替换 user）
      </button>
    </div>
  )
}
```

可以把行为记成一句话：`shallowReactive` 关注“第一层字段是否变化”。像 `state.user = nextUser` 这类第一层赋值会触发更新；仅修改 `state.user.name` 这类深层属性时，不应依赖它自动触发刷新。

### `isReactive`：判断值是否为响应式对象

`isReactive(value)` 用于判断一个值是否由 `reactive` 或 `shallowReactive` 创建。它常用于工具函数、调试日志、边界分支判断（例如“传进来的是普通对象还是响应式对象”）。

```tsx
import { reactive, shallowReactive, isReactive } from '@viewfly/core'

const deepState = reactive({ count: 0 })
const shallowState = shallowReactive({ count: 0 })
const plain = { count: 0 }

console.log(isReactive(deepState)) // true
console.log(isReactive(shallowState)) // true
console.log(isReactive(plain)) // false
```

`isReactive` 只负责“识别类型”，不会建立依赖，也不会触发更新。通常把它放在调试或分支逻辑里使用，不要把它当作状态监听手段。

### `toRaw`：拿到响应式对象对应的原始对象

`toRaw(value)` 用于从响应式对象拿到其原始对象。典型场景是：与第三方库交互时需要非代理对象，或在日志里想看更接近原始结构的数据。

```tsx
import { reactive, toRaw } from '@viewfly/core'

const state = reactive({
  user: { name: 'A', age: 18 },
})

const raw = toRaw(state)
console.log(raw === state) // false
console.log(raw.user.name) // A
```

`toRaw` 返回的是“同一份数据的原始视图”，不是深拷贝。也就是说，`raw` 和响应式对象底层仍指向同一份数据。实践中建议把 `toRaw` 主要用于读取、调试和桥接；若你要做可预测的界面更新，仍应通过响应式对象本身（如 `state.xxx = next`）进行写入。

### `createSignal`：getter / setter 形态

如果你更喜欢“函数式读写”的风格，可以用 `createSignal`。它返回的是一个 signal 实例：读取用 `state()`，写入用 `state.set(next)`。它既能存基础类型，也能存对象。

```tsx
import { createSignal } from '@viewfly/core'

function Counter() {
  const count = createSignal(0)
  return () => (
    <button type="button" onClick={() => count.set(count() + 1)}>
      {count()}
    </button>
  )
}
```

当 signal 的值是对象时，有一个很容易踩的点：直接改对象内部属性不会触发更新，因为你没有调用 setter。

```tsx
function WrongCase() {
  const user = createSignal({ name: 'A', age: 18 })
  return () => (
    <button
      onClick={() => {
        user().age += 1
      }}
    >
      {user().age}
    </button>
  )
}
```

正确做法是基于当前值构造新对象，再通过 `set` 写回去。

```tsx
function RightCase() {
  const user = createSignal({ name: 'A', age: 18 })
  return () => (
    <button
      onClick={() => {
        const current = user()
        user.set({ ...current, age: current.age + 1 })
      }}
    >
      {user().age}
    </button>
  )
}
```

可以把这条规则记成一句话：用 signal 时，更新必须走 `set`；不调用 `set` 就不会触发更新。

## `computed`：派生值

`computed(getter)` 适合表达“这个值不是直接存的，而是由别的状态算出来的”。例如购物车总价由单价和数量推导而来。读取 `computed` 结果时使用 `.value`。

```tsx
import { reactive, computed } from '@viewfly/core'

function Cart() {
  const state = reactive({
    price: 99,
    quantity: 2,
  })
  const total = computed(() => state.price * state.quantity)

  return () => (
    <div>
      <button type="button" onClick={() => state.quantity++}>
        数量 +1
      </button>
      <p>总价：{total.value}</p>
    </div>
  )
}
```

`computed` 的 `getter` 建议保持纯计算，不在里面做请求、日志上报这类副作用；这样依赖关系会更清晰，也更容易排查问题。

## `watch`：监听明确来源

`watch(trigger, callback)` 适合“我明确知道要观察哪个值”的场景。`trigger` 负责给出监听源，`callback(newVal, oldVal)` 在变化时执行。它会返回一个停止函数，必要时可以手动停止监听。

```tsx
import { reactive, watch } from '@viewfly/core'

function SearchBox() {
  const model = reactive({ q: '' })

  watch(
    () => model.q,
    (next, prev) => {
      console.log('search changed:', prev, '->', next)
    },
  )

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

这个 API 很适合做“值变化 -> 执行副作用”的链路，例如请求、日志、同步 URL 参数等。

## `watchEffect`：自动收集依赖的副作用

`watchEffect(effect)` 更适合“先写副作用逻辑，再让框架自动收集依赖”的场景。它会先执行一次 `effect`，后续只要 `effect` 里读到的响应式状态变化，就会再次执行。返回值同样是停止函数。

```tsx
import { reactive, watchEffect } from '@viewfly/core'

function App() {
  const model = reactive({ q: '' })

  watchEffect(() => {
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

如果你能明确指出监听源，优先用 `watch`；如果依赖较多、写 `trigger` 很啰嗦，再考虑 `watchEffect`。

## 清理与释放：组件内 vs 组件外

在组件主体里调用 `watch` / `watchEffect` 时，监听会随组件销毁自动释放。只有在组件外使用时，才需要自己保存停止函数并在合适时机调用。

```tsx
import { reactive, watch } from '@viewfly/core'

const store = reactive({ count: 0 })

const stop = watch(
  () => store.count,
  v => {
    console.log('count:', v)
  },
)

// 不再需要监听时手动停止
stop()
```

这条规则可以帮你避免常见内存泄漏：组件外创建的监听如果忘记停，会一直存在。

## 常见注意点

### 1) 组件主体里读、渲染函数里不读

下面这种写法里，`model.count` 只在组件主体里读了一次，没有参与渲染函数的视图计算，所以点击后界面不会更新：

```tsx
function BadCase() {
  const model = reactive({ count: 0 })
  console.log(model.count)
  return () => <button onClick={() => model.count++}>+1</button>
}
```

改法是把读取放到渲染函数里，让视图显式依赖这个状态。

```tsx
function GoodCase() {
  const model = reactive({ count: 0 })
  return () => <button onClick={() => model.count++}>{model.count}</button>
}
```

### 2) 直接解构拿到快照

下面是常见误用。`count` 在解构那一刻只是快照，不会继续跟随 `model.count` 变化：

```tsx
function BadCase() {
  const model = reactive({ count: 0 })
  const { count } = model
  return () => <button onClick={() => model.count++}>{count}</button>
}
```

改法是始终通过 `model.count` 访问，避免在组件主体提前解构出快照值。

```tsx
function GoodCase() {
  const model = reactive({ count: 0 })
  return () => <button onClick={() => model.count++}>{model.count}</button>
}
```

## 下一步

- [生命周期](./lifecycle.md)
- [创建应用](./essentials-application.md)
