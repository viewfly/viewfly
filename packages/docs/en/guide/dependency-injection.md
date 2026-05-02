# Dependency injection

Many newcomers instantiate services with `new` inside components or pull in global singletons. That works at first, but as the app grows you tend to hit:

- Mixed responsibilities—business logic and dependency wiring live together and components balloon;
- Hard swaps between implementations (e.g. prod vs test loggers) scattered across files;
- Painful testing because substitutes (**mocks**, fake implementations) are awkward to plug in.

Dependency injection (DI) addresses this by **moving “how dependencies are created/replaced” out of component business logic**. Components only say **what they need** and **use it**.

In practice: register dependencies upstream, let components declare needs by **token** or **type**, and let the **container** resolve instances at runtime.

Reach for DI when:

- A dependency should be shared across components;
- Implementations should vary by environment or feature slice;
- You want clearer tests and maintenance.

In Viewfly, a minimal mental model is enough to start: **define → register → inject**.

## Prerequisites

DI samples use decorators such as `@Injectable()`. In TypeScript projects enable:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

Ensure `reflect-metadata` loads **before** DI runs (usually via `@viewfly/core`’s main entry; if not, add `import 'reflect-metadata'` at the very top).

- **`reflect-metadata`**: reads decorator-emitted type metadata at runtime.

### Build tooling

Follow these so decorator metadata exists at runtime:

1. In `tsconfig.json`: `experimentalDecorators: true`, `emitDecoratorMetadata: true`.
2. Load `reflect-metadata` before DI executes (normally handled by `@viewfly/core`; otherwise import manually).
3. With **Vite**, add a pipeline that emits metadata (**SWC** or **Babel** recommended).
4. Verify with the “minimal loop” example on this page.

#### Option A: Vite + SWC

Install:

```bash
npm install -D vite-plugin-swc-transform
```

Wire SWC in `vite.config.ts` with decorator metadata:

```ts
import { defineConfig, type Plugin } from 'vite'
import swc from 'vite-plugin-swc-transform'

export default defineConfig({
  plugins: [
    swc({
      swcOptions: {
        jsc: {
          parser: {
            syntax: 'typescript',
            decorators: true,
            tsx: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: true,
            useDefineForClassFields: false,
          },
        },
      },
    }) as Plugin,
  ],
})
```

#### Option B: Vite + Babel

If you already use Babel:

```bash
npm install -D @babel/core @babel/plugin-proposal-decorators babel-plugin-transform-typescript-metadata vite-plugin-babel
```

Example `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    babel({
      babelConfig: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          'babel-plugin-transform-typescript-metadata',
        ],
      },
    }),
  ],
})
```

## Minimal loop: define → register → use

Three roles, easier to maintain when separated:

- **Define**: name the dependency (class or token) so relationships are explicit and swappable.
- **Register**: say where instances come from (root or local providers) and centralize construction.
- **Use**: call `inject(...)` from the component body for business logic only.

Why split “create” from “use”? Keeping both inside components grows files fast and blocks tests; separating assembly from usage improves reuse and testing.

```tsx
import { Injectable, inject } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

// 1) Define: mark an injectable service
@Injectable()
class UserService {
  getName() {
    return 'Viewfly'
  }
}

function Child() {
  // 3) Use: resolve in the component body
  const userService = inject(UserService)
  return () => <p>{userService.getName()}</p>
}

createApp(<Child />)
  // 2) Register: hand providers to the app before mount
  .provide(UserService)
  .mount(document.getElementById('app')!)
```

## Where to register: root vs local

**Should this service be shared app-wide or scoped to a page/module?**

- **Global singleton-style sharing** (config, loggers): **root registration**.
- **Subtree-only visibility** (feature-local state): **local registration**.

### Root registration

When you do not want to repeat registration per page and the instance should survive route changes:

```tsx
createApp(<App />)
  .provide([AService, BService])
  .mount(document.getElementById('app')!)
```

### Local registration

When only a subtree should see the service—avoid leaking providers tree-wide:

Wrap with `createContext([...])`; injections resolve only under that subtree.

```tsx
import { createContext, inject, Injectable } from '@viewfly/core'

@Injectable()
class ThemeService {
  mode = 'dark'
}

const ThemeContext = createContext([ThemeService])

function Child() {
  const theme = inject(ThemeService)
  return () => <p>{theme.mode}</p>
}

function App() {
  return () => (
    <ThemeContext>
      <Child />
    </ThemeContext>
  )
}
```

Short map:

- Root: default **app-wide shared**.
- Local: default **subtree scoped**.

## Instance reuse rules

Reuse depends on whether resolution happens in the **same injector**:

- Same injector: first resolution caches; later resolves reuse.
- Child layer re-provides the same token: **child wins** (nearest provider).
- Parallel subtrees: identical provider configs usually yield **different instances**.

That is why root `provide` feels like an **app singleton**, while `createContext` behaves like a **local singleton**.

## Local boundaries in the tree

### 1) `withAnnotation`

Use when a **module host component** should always carry a fixed set of providers.

```tsx
import { withAnnotation } from '@viewfly/core'

export const FeatureHost = withAnnotation(
  { providers: [FeatureService] },
  function FeatureHost(props: { children?: any }) {
    return () => <>{props.children}</>
  },
)
```

Best when the DI boundary is fixed at **component definition** time.

### 2) `createContext`

Use when the same provider bundle should wrap **different subtrees** in multiple places.

```tsx
import { createContext } from '@viewfly/core'

const ThemeContext = createContext([ThemeService])

function App() {
  return () => (
    <>
      <ThemeContext><PageA /></ThemeContext>
      <ThemeContext><PageB /></ThemeContext>
    </>
  )
}
```

Best when you **reuse one container shape** everywhere.

### 3) `createContextProvider`

Use when you frequently override **one token** locally (e.g. swap logger impl) without repeating `createContext([...])`.

```tsx
import { createContextProvider } from '@viewfly/core'

const LoggerProvider = createContextProvider({ provide: LoggerService })

function App() {
  return () => (
    <LoggerProvider useClass={ConsoleLoggerService}>
      <Page />
    </LoggerProvider>
  )
}
```

Best for **single-token overrides**.

Quick pick:

- Module host component → `withAnnotation`
- Reusable provider group → `createContext`
- Single-token local swap → `createContextProvider`

## Common provider shapes

`app.provide(...)` / `createContext([...])` accept `Provider` or `Provider[]`.  
A **Provider** tells the container **how** to satisfy a dependency. Four frequent patterns:

### 1) Pass the class (`TypeProvider`)

When the class **is** the default implementation.

```tsx
@Injectable()
class UserService {}

createApp(<App />)
  .provide(UserService)
  .mount(document.getElementById('app')!)
```

The class acts as both token and `useClass`.

### 2) Fixed value (`ValueProvider`)

Constants, prebuilt objects, env maps.

```tsx
import { InjectionToken } from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

createApp(<App />)
  .provide({ provide: API_URL, useValue: '/api' })
  .mount(document.getElementById('app')!)
```

`useValue` skips instantiation.

### 3) Class binding (`ClassProvider`)

Expose a stable token while swapping implementations.

```tsx
createApp(<App />)
  .provide({
    provide: LoggerService,
    useClass: ConsoleLoggerService,
  })
  .mount(document.getElementById('app')!)
```

Consumers keep calling `inject(LoggerService)`; registration picks the concrete class.

### 4) Factory (`FactoryProvider`)

Construction needs parameters or branching.

```tsx
createApp(<App />)
  .provide({
    provide: SessionService,
    useFactory: () => new SessionService('guest'),
  })
  .mount(document.getElementById('app')!)
```

Prefer `useFactory` when `useClass` is too rigid.

### Combining providers

Real apps mix patterns:

```tsx
import { InjectionToken } from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

createApp(<App />)
  .provide([
    UserService,
    { provide: API_URL, useValue: '/api' },
    { provide: LoggerService, useClass: ConsoleLoggerService },
    { provide: SessionService, useFactory: () => new SessionService('guest') },
  ])
  .mount(document.getElementById('app')!)
```

Within one `Provider[]` layer, **later entries override earlier ones** for the same token:

```tsx
createApp(<App />)
  .provide([
    { provide: LoggerService, useClass: ConsoleLoggerService },
    { provide: LoggerService, useClass: RemoteLoggerService }, // wins
  ])
  .mount(document.getElementById('app')!)
```

## Where to call `inject(...)`

`inject(...)` must run in the **component body**, not inside render:

```tsx
function Profile() {
  const userService = inject(UserService)
  return () => <p>{userService.getName()}</p>
}
```

## Troubleshooting

1. **`inject` inside render** — move it to the body.  
2. **Using before providers exist** — ensure `provide` / `createContext` wraps renders.  
3. **Tokens look equal but differ by reference** — export and reuse one token module-wide.  
4. **Business-domain isolation or dynamic mounting** — see [Dependency injection in depth](./dependency-injection-in-depth.md).

## Deeper rules

Advanced topics live in [Dependency injection in depth](./dependency-injection-in-depth.md):

- Full signature of `inject(token, notFoundValue?, flags?)`
- `deps` ordering and parameter decorators (`@Inject`, `@Optional`, `@Self`, `@SkipSelf`)
- `forwardRef`, `@Prop`, and domain isolation

## Next steps

- [Creating an application](./essentials-application.md)
- [Router](./router.md)
- [Dependency injection in depth](./dependency-injection-in-depth.md)
