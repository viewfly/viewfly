# Reactivity

Reactivity answers: **when data changes, how does the UI follow**. In Viewfly you will most often use `reactive`, `createSignal`, `computed`, `watch`, and `watchEffect`. Think of them as three layers: **mutable state**, **derived values**, and **side-effect listeners**.

## Minimal example: input stays in sync

This shows the core loop: the input updates `model.text`, the render function reads `model.text`, and the UI reflects the latest value.

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
      <p>Current input: {model.text}</p>
    </div>
  )
}

createApp(<App />).mount(document.getElementById('app')!)
```

Two takeaways: **`reactive`** turns a plain object into tracked state; **state must be read inside the render function** so the framework knows the view depends on it.

## Read/write rules

Start with two rules. **Read** reactive state in render—e.g. put `model.text` in JSX. **Write** from events or business logic—e.g. `model.text = next`.

Common pitfall: **do not reassign the reactive binding** to a brand-new plain object—you lose the reactive link.

```tsx
function BadCase() {
  let model = reactive({ count: 0 })

  const reset = () => {
    // Wrong: the variable now points at a plain object
    model = { count: 0 }
  }

  return () => <button onClick={reset}>{model.count}</button>
}

function GoodCase() {
  const model = reactive({ count: 0 })

  const reset = () => {
    // Right: mutate properties on the same reactive object
    model.count = 0
  }

  return () => <button onClick={reset}>{model.count}</button>
}
```

## Common patterns

### Form field object

When several fields edit together, one `reactive` object usually fits well.

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
        Age +1
      </button>
      <p>{form.name || 'Empty'} / {form.age}</p>
    </section>
  )
}
```

Keep **display** and **writes** on the same field (e.g. `form.name`) so it is obvious where input and output meet.

### Toggling list items

Lists often need **per-row** updates. Here each `item.done` toggles independently.

```tsx
function TodoList() {
  const state = reactive({
    items: [
      { id: 1, text: 'Read the docs', done: false },
      { id: 2, text: 'Write examples', done: true },
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

Updating the current row inside `map` stays direct; conceptually you change **this row only**.

### `shallowReactive`: track only top-level keys

`shallowReactive` fits when you only care about **first-level** property changes. Like `reactive`, it wraps an object, but nested objects are **not** deep-reactive.

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
          // Mutating nested fields: updates are not guaranteed
          state.user.age += 1
        }}
      >
        Age +1 (deep mutate)
      </button>
      <button
        type="button"
        onClick={() => {
          // Replacing a top-level field: triggers updates
          state.user = { ...state.user, age: state.user.age + 1 }
        }}
      >
        Age +1 (replace user)
      </button>
    </div>
  )
}
```

Remember: `shallowReactive` cares whether **top-level** fields change. Assignments like `state.user = nextUser` refresh the UI; relying on deep mutations such as `state.user.name` alone is unsafe.

### `isReactive`: detect reactive objects

`isReactive(value)` tells you whether a value was created with `reactive` or `shallowReactive`. Useful in utilities, logging, or branches (“plain object vs reactive”).

```tsx
import { reactive, shallowReactive, isReactive } from '@viewfly/core'

const deepState = reactive({ count: 0 })
const shallowState = shallowReactive({ count: 0 })
const plain = { count: 0 }

console.log(isReactive(deepState)) // true
console.log(isReactive(shallowState)) // true
console.log(isReactive(plain)) // false
```

`isReactive` only **identifies** values—it does not subscribe or schedule updates. Use it for debugging or branching, not as a replacement for `watch`.

### `toRaw`: underlying plain object

`toRaw(value)` returns the raw object behind a reactive proxy. Typical uses: hand data to a third-party library that rejects proxies, or log something closer to the original shape.

```tsx
import { reactive, toRaw } from '@viewfly/core'

const state = reactive({
  user: { name: 'A', age: 18 },
})

const raw = toRaw(state)
console.log(raw === state) // false
console.log(raw.user.name) // A
```

`toRaw` is **not** a deep clone—it exposes the same underlying data. Prefer `toRaw` for reads, debugging, and bridges; for predictable UI updates, still write through the reactive object (`state.xxx = next`).

### `createSignal`: getter / setter style

If you prefer a functional read/write API, use `createSignal`. It returns a signal: read with `state()`, write with `state.set(next)`. Works for primitives and objects.

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

When the signal holds an object, a common mistake is mutating inner fields without calling the setter—no update fires.

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

Build a new object from the current value, then `set` it.

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

Rule of thumb: **updates must go through `set`**; skipping `set` skips reactive notifications.

## `computed`: derived values

`computed(getter)` expresses values **derived** from other state—e.g. cart total from price × quantity. Read the result via `.value`.

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
        Quantity +1
      </button>
      <p>Total: {total.value}</p>
    </div>
  )
}
```

Keep `computed` getters **pure**—avoid network calls, analytics, and other side effects there so dependencies stay obvious.

## `watch`: explicit sources

`watch(trigger, callback)` fits when you **know exactly what** to observe. `trigger` yields the source; `callback(newVal, oldVal)` runs on change. It returns a **stop** function.

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

Great for “value changed → side effect”: fetching, logging, syncing URL params, etc.

## `watchEffect`: auto-tracked side effects

`watchEffect(effect)` fits when you write the effect first and let the framework **collect dependencies**. It runs `effect` once immediately, then reruns whenever reactive state read inside changes. Also returns a stop function.

```tsx
import { reactive, watchEffect } from '@viewfly/core'

function App() {
  const model = reactive({ q: '' })

  watchEffect(() => {
    document.title = model.q ? `Search: ${model.q}` : 'Search'
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

If you can name the sources cleanly, prefer `watch`; when triggers would be noisy, consider `watchEffect`.

## Teardown: inside vs outside components

`watch` / `watchEffect` registered in a **component body** stop automatically when the component is destroyed. Outside components, **keep the stop function** and call it when done.

```tsx
import { reactive, watch } from '@viewfly/core'

const store = reactive({ count: 0 })

const stop = watch(
  () => store.count,
  v => {
    console.log('count:', v)
  },
)

// Stop manually when no longer needed
stop()
```

Forgetting to stop watchers created outside components is a common leak.

## Common pitfalls

### 1) Read only in the body, not in render

Here `model.count` is read once in the body (e.g. logged) but **not** in the view—clicks will not refresh the label:

```tsx
function BadCase() {
  const model = reactive({ count: 0 })
  console.log(model.count)
  return () => <button onClick={() => model.count++}>+1</button>
}
```

Read inside render so the view depends on the field.

```tsx
function GoodCase() {
  const model = reactive({ count: 0 })
  return () => <button onClick={() => model.count++}>{model.count}</button>
}
```

### 2) Destructuring snapshots

Destructuring grabs a **snapshot** at that moment—it will not track future `model.count` changes:

```tsx
function BadCase() {
  const model = reactive({ count: 0 })
  const { count } = model
  return () => <button onClick={() => model.count++}>{count}</button>
}
```

Use `model.count` in render instead of destructuring reactive fields early in the body.

```tsx
function GoodCase() {
  const model = reactive({ count: 0 })
  return () => <button onClick={() => model.count++}>{model.count}</button>
}
```

## Next steps

- [Lifecycle](./lifecycle.md)
- [Creating an application](./essentials-application.md)
