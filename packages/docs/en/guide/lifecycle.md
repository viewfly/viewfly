# Lifecycle

Lifecycle hooks answer **when** a piece of logic should run. In components you usually care about three moments: initialize after first mount, sync after each update, and clean up on teardown. In Viewfly those map to **`onMounted`**, **`onUpdated`**, and **`onUnmounted`**.

Register all three in the **component body**, never inside the **render function**.

## Where to call: component body

Minimal example: `onMounted` sits in the body, not inside `return () => ...`.

```tsx
import { reactive, onMounted } from '@viewfly/core'

function App() {
  const model = reactive({ count: 0 })

  // Correct: called from the component body
  onMounted(() => {
    console.log('mounted')
  })

  return () => <button onClick={() => model.count++}>{model.count}</button>
}
```

## `onMounted`

`onMounted` runs after the component is attached to the DOM. Typical uses: wire DOM listeners, start timers, bootstrap third-party widgets.

The callback may **return a teardown function** that runs before the component is destroyed.

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

Pair setup with cleanup: whatever you attach, release it in the returned function.

## `onUpdated`

`onUpdated` runs after a render commit finishes. Use it for work that should happen **after** the UI reflects new state—e.g. updating `document.title`, reporting metrics, or reading post-update DOM.

```tsx
import { reactive, onUpdated } from '@viewfly/core'

function App() {
  const model = reactive({ q: '' })

  onUpdated(() => {
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

`onUpdated` may also return a cleanup function. Before the **next** update runs, the previous cleanup executes—handy for debouncing or cancelling in-flight work.

```tsx
import { reactive, onUpdated } from '@viewfly/core'

function SearchPanel() {
  const model = reactive({ q: '' })

  onUpdated(() => {
    const timer = setTimeout(() => {
      console.log('sync keyword:', model.q)
    }, 200)

    // Runs before the next update to avoid stacked side effects
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

`onUnmounted` runs when the component is torn down—subscriptions, timers, external instances, and other “last chance” cleanup.

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

## Combined example: mount, update, destroy

All three hooks in one component: log on mount, debounce sync on update, clear pending timers on unmount.

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

## Pitfalls

### 1) Calling hooks inside render (wrong)

Render runs many times; hook registration must be a **stable, one-time** flow in the body.

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

Fix: move `onMounted`, `onUpdated`, and `onUnmounted` into the component body.

### 2) Forgetting teardown

Listeners, timers, or third-party instances created in `onMounted` need a matching cleanup—either return a function from `onMounted` or release resources in `onUnmounted`. Otherwise remount cycles leak memory and duplicate handlers.

---

For additional hooks and signatures, follow the lifecycle exports and typings in **`@viewfly/core`**.

## Next steps

- [Dependency injection](./dependency-injection.md)
- [Application in depth](./application-in-depth.md)
