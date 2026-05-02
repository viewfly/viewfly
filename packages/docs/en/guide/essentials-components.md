# JSX & components

This page ties together the everyday patterns for `JSX` and function components: `props`, parent/child communication, DOM events, `style`, `class`, `ref`, and `Portal`. Skim [Quick start](./quick-start.md) or [Creating an application](./essentials-application.md) first, and finish the `jsxImportSource` setup from [Installation](./installation.md).

## From JSX to UI: a view tree

Think of JSX as a language for describing a **tree of UI**. Built-ins such as `<div>` and `<button>` become real DOM; capitalized tags like `<Counter />` are component nodes that expand into child UI at runtime. Children—plain JSX or `{expressions}`—participate in the parent’s layout.

Nesting can be sketched as:

```text
App
├── Header
└── Main
    └── Counter
```

## Function components: two stages

Viewfly uses **one function** per component. On creation it runs the **component body** (the code **before** `return`, **once**—often called **setup** in types and docs). Put **`reactive` / `createSignal`**, **`onMounted`**, **`watch`**, and similar there.

The **return value** describes **how this render pass should look**. Two common shapes: return a **render function** (the framework calls it again on refresh to read fresh JSX), or return an object with `render()` (refresh calls `render()`, and you can expose methods for parents via `ref`). Examples below use the **render-function** style; the object shape is not expanded here.

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

Use **`<Counter />`** from other components.

**Component body vs render function**

The body runs one-time setup; place `onMounted`, `watch`, and friends there (see [Lifecycle](./lifecycle.md)). What runs repeatedly on refresh is the render function (or `render` on the object). If reactive state is read only in the body and never in render, the UI usually will not track it.

See [Reactivity](./essentials-reactivity.md) for full patterns around state and side effects.

## `props` (data from the parent)

The first parameter of the component function is **`props`**, the data the parent passes in:

```tsx
function Hello(props: { name: string }) {
  return () => <p>Hello, {props.name}</p>
}
```

Parent usage:

```tsx
<Hello name="Viewfly" />
```

### Typing `props` with TypeScript

Declare a dedicated interface or alias so required vs optional fields are explicit:

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

### Avoid destructuring `props`

Prefer **`props.field`** consistently. Destructuring in the body can break reactive semantics—later `props` updates may not reach the UI or watchers.

```tsx
// Bad: destructuring can lose reactive semantics
function BadUserCard(props: { userId: string }) {
  const { userId } = props
  return () => <div>{userId}</div>
}

// Good: keep props.userId
function GoodUserCard(props: { userId: string }) {
  return () => <div>{props.userId}</div>
}
```

### Watching `props`

When you need side effects on `props` changes (refetch, analytics, logging), use `watch` in the component body:

```tsx
import { watch } from '@viewfly/core'

function UserCard(props: { userId: string }) {
  watch(
    () => props.userId,
    (nextId, prevId) => {
      console.log('userId changed:', prevId, '->', nextId)
    },
  )

  return () => <div>Current user: {props.userId}</div>
}
```

Rule of thumb: register `watch` in the body with an explicit source such as `() => props.userId`; only add it when you truly need side effects. For display-only UI, reading `props` in render is enough.

## Parent/child communication

Most parent/child flows are **data down** and **notifications up**.

```text
Parent
├── Down: pass data and configuration via props
└── Up: pass callbacks via props; the child invokes them when appropriate
```

For **down**, the parent puts values on `props`; the child reads and renders. For **up**, the parent passes functions on `props`; the child calls them when ready (e.g. `props.onSave?.(payload)`). If the parent nests JSX between the child’s tags, that content arrives as `props.children`, which you can render wherever you like.

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
    <Panel title="Settings">
      <p>This content appears inside the panel body.</p>
    </Panel>
  )
}
```

For deeper sharing across layers, see [Dependency injection](./dependency-injection.md).

## `Portal` (render into an external container)

`Portal` renders its children into another DOM target—common for modals, drawers, and global overlays.

```tsx
import { Portal } from '@viewfly/core'

function App() {
  const modal = document.getElementById('modal-root')
  if (!modal) {
    throw new Error('Missing #modal-root mount target')
  }

  return () => (
    <div>
      <h1>Page</h1>
      <Portal container={modal}>
        <div class="dialog">This content is rendered inside modal-root.</div>
      </Portal>
    </div>
  )
}
```

Example page shell:

```html
<div id="app"></div>
<div id="modal-root"></div>
```

Three reminders: `container` must be an existing real node; `Portal` only changes **where** things paint, not logical ownership in the tree; modals usually pair with state to show/hide.

## Events

Built-in elements use **`on` + PascalCase event name** in JSX; the value is a handler that receives the usual **`DOM`** event object (exact types come from **TypeScript** and **`@viewfly/platform-browser`**).

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
        Submit
      </button>
    </div>
  )
}
```

Call **`e.preventDefault()`**, **`e.stopPropagation()`**, and friends exactly like native handlers when needed.

## `style`

On built-ins, `style` may be a **string** or an **object**. Strings resemble HTML’s `style` attribute; object keys are CSS property names (camelCase allowed), values string or number. Pair with reactive state by reading fresh values in the render function so styles track updates (see [Reactivity](./essentials-reactivity.md)).

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

## `class`

`class` controls the element’s class list. Common forms are strings, objects, arrays, and nested combinations.

```text
How can class be expressed?
├── String: one or more names (space-separated)
├── Array: flatten segments in order into the final class list
├── Object: keys are candidate names; truthy values win
└── Arrays mixing objects / nested arrays: good for conditional groups
```

In object form, keys with a truthy value apply; arrays can mix strings, objects, and child arrays. When state drives appearance, build the structure from current values inside render.

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

Other common **`HTML`** attributes (**`id`**, **`disabled`**, **`data-*`**, etc.) follow **`JSX`** and **`@viewfly/platform-browser`** typings; **`SVG`** namespaces likewise defer to the types.

## Composition and boundaries

Split UI into function components by region, then compose with `props` and `children` for readability and tests. Reach for [Dependency injection](./dependency-injection.md) or heavier global state only when parent/child props are no longer enough—avoid premature singletons.

## `ref` (DOM nodes or child instances)

After you are comfortable with components, `props`, and events, `ref` is the next step. In the component body, `ref` binds to a node or child instance. Typical APIs: `createRef<T>()` (read `ref.value`) and `createDynamicRef<T>(fn)` (run a callback as soon as the instance exists).

### `createRef`: parent calls methods on a child

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

### `createRef`: grab a DOM node

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

### `createDynamicRef`: side effects as soon as the instance exists

```tsx
import { createDynamicRef } from '@viewfly/core'

function App() {
  const inputRef = createDynamicRef<HTMLInputElement>(node => {
    node.focus()
    const onFocus = () => console.log('focused')
    node.addEventListener('focus', onFocus)

    // cleanup when the node is torn down
    return () => node.removeEventListener('focus', onFocus)
  })

  return () => <input ref={inputRef} />
}
```

### `createDynamicRef`: child component instance

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

Usually read `ref.value` inside `onMounted` or later handlers. A component `ref` points at the object the child returned (if the child only returns a render function, there are no custom methods to call). When you want side effects **the moment** an instance appears, prefer `createDynamicRef`.

## Caveats

Extracting reusable handlers in the body often reads clearer; inline lambdas such as `onClick={() => ...}` are usually fine. What to avoid is snapshotting reactive data once in the body and relying on that stale value across renders. Also keep `onMounted`, `watch`, and similar hooks in the **component body**, not inside the render function (see [Lifecycle](./lifecycle.md) and [Reactivity](./essentials-reactivity.md)).

## Next steps

- [Reactivity](./essentials-reactivity.md)  
- [Creating an application](./essentials-application.md) — recap mount and entry  
