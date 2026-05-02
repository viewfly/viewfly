# Dependency injection in depth

Building on [Dependency injection](./dependency-injection.md), this page spells out Viewfly DI at runtime: **`Provider` resolution**, instance caching, **`inject` flags**, parameter decorators, and **`scope`** boundaries.

## How to read this chapter

There is a lot here—pick by problem:

- Injection lookup behavior → **`inject(token, notFoundValue?, flags?)`**
- `deps` or ctor-parameter decorators → **`deps` priority** and **parameter decorators**
- “type declared later” errors → **`forwardRef`**
- Module boundaries → **`scope`**
- Production debugging → **Common errors** at the end

## Runtime overview

When `inject(...)` runs:

1. Walk up from the current component to the nearest **`Injector`**.
2. Apply lookup rules (default / `Self` / `SkipSelf`) to choose the starting layer.
3. Resolve the provider’s dependencies, then construct the instance.
4. Cache the token on that injector; later resolves in the **same** injector reuse it.
5. If nothing matches and there is no **`notFoundValue`**, throw.

That explains three recurring behaviors: **nearest provider wins**, **same injector ⇒ singleton**, and **`No provide for ...`** when the chain has no binding.

## Instance cache and lifetime

Reuse depends on resolving inside the **same injector**:

- Same injector: first resolve caches; later resolves reuse.
- Child injector providing the same token **shadows** the parent (**nearest wins**).
- Parallel subtrees with identical configs usually get **different instances** if injectors differ.

Hence root `provide` feels **app-wide singleton**, while local context feels **scoped singleton**.

## Provider kinds and resolution traps

Basic shapes (`Type` / `Class` / `Value` / `Factory` / `Existing` / `Constructor`) are covered in [Dependency injection](./dependency-injection.md). Sharp edges:

- Within one `Provider[]` layer: **later entries override earlier** for the same token.
- **`ValueProvider` / `ExistingProvider`** ignore `deps`.
- **`ClassProvider`** with explicit **`deps`** uses **only** `deps`, not ctor-parameter inference.
- **`FactoryProvider`** receives arguments **only** from `deps` order—no type-based guessing.

### `deps` priority

**Rule:** `deps` is an **explicit argument list**. If present, it wins.

#### 1) Who supports `deps`

- Supported: `ClassProvider` / `FactoryProvider` / `ConstructorProvider`
- Ignored: `ValueProvider` / `ExistingProvider`

```tsx
app.provide([
  { provide: A, useValue: 1 }, // deps ignored
  { provide: B, useExisting: A }, // deps ignored
  {
    provide: C,
    useFactory: (a: number) => a + 1,
    deps: [A], // deps apply
  },
])
```

#### 2) `ClassProvider`: explicit `deps` beats inference

Without `deps`, ctor metadata drives resolution; with `deps`, **only** `deps` apply.

```tsx
@Injectable()
class ClientService {
  constructor(
    public readonly url: string,
    public readonly logger: LoggerService,
  ) {}
}

app.provide([
  { provide: API_URL, useValue: '/api' },
  // Even if the ctor lists LoggerService, deps win
  {
    provide: ClientService,
    useClass: ClientService,
    deps: [API_URL, LoggerService],
  },
])
```

#### 3) `FactoryProvider`: order-only

`useFactory(a, b, c)` must align with `deps: [A, B, C]`—no automatic typing.

```tsx
app.provide([
  { provide: API_URL, useValue: '/api' },
  { provide: LoggerService, useClass: ConsoleLogger },
  {
    provide: SessionService,
    useFactory: (url: string, logger: LoggerService) =>
      new SessionService(url, logger),
    deps: [API_URL, LoggerService], // order matches parameters
  },
])
```

#### 4) What each `deps` entry can be

- Plain token: `UserService`, `API_URL`
- Decorator tuples: `[UserService, new Optional()]`, `[new Inject(API_URL)]`
- Forward refs: `forwardRef(() => UserService)`

```tsx
import {
  Inject,
  Injectable,
  InjectionToken,
  Optional,
  Self,
  forwardRef,
} from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

@Injectable()
class ClientService {
  constructor(
    public readonly url: string,
    public readonly tracker: Tracker,
  ) {}
}

app.provide([
  { provide: API_URL, useValue: '/api' },
  {
    provide: ClientService,
    useClass: ClientService,
    deps: [
      [new Inject(API_URL)],
      [forwardRef(() => Tracker), new Optional(), new Self()],
    ],
  },
])
```

Use explicit `deps` when you need precise sources (“must be local”, “missing ⇒ null”, forward-declared types).

## `inject(token, notFoundValue?, flags?)`

Beyond the token you control **missing behavior** and **lookup scope**:

```tsx
import { InjectFlags, inject } from '@viewfly/core'

function Demo() {
  const localOnly = inject(LocalService, null, InjectFlags.Self)
  const fromParent = inject(ThemeService, null, InjectFlags.SkipSelf)
  const fallback = inject(API_CONFIG, { baseUrl: '/api' })

  return () => <div />
}
```

- **`notFoundValue`**: returned when nothing resolves; omit it to throw instead.
- **`flags`** steer lookup:

| flags | Meaning | Typical use |
|-------|---------|-------------|
| `InjectFlags.Default` | Current injector, then parents | Normal injection |
| `InjectFlags.Self` | Current injector only | Force local binding |
| `InjectFlags.SkipSelf` | Skip current, start at parent | Force parent binding |
| `InjectFlags.Optional` | Allow “not found” branch | Often with `notFoundValue` |

Safest optional pattern in app code: pass an explicit **`notFoundValue`** (e.g. `null`).

“Local only, else null”:

```tsx
import { InjectFlags, inject } from '@viewfly/core'

function Toolbar() {
  const localTracker = inject(TrackerService, null, InjectFlags.Self | InjectFlags.Optional)
  return () => <div>{localTracker ? 'has tracker' : 'no tracker'}</div>
}
```

Call-site shows both **scope (`Self`)** and **fallback (`notFoundValue`)**.

## Constructor-parameter decorators

Four DI decorators for ctor parameters:

- **`@Inject(token)`** — bind this slot to a specific token (overrides type inference).
- **`@Self()`** — resolve only from the current injector.
- **`@SkipSelf()`** — start lookup at the parent injector.
- **`@Optional()`** — allow missing; injects `null`.

```tsx
import { Inject, Injectable, InjectionToken, Optional, Self, SkipSelf } from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

@Injectable()
class FeatureService {
  constructor(
    @Inject(API_URL) private readonly apiUrl: string,
    @Optional() private readonly tracker: Tracker,
    @Self() private readonly localStore: LocalStore,
    @SkipSelf() private readonly parentTheme: ThemeService,
  ) {}
}
```

Multiple decorators on one parameter **compose**—e.g. `@SkipSelf()` + `@Optional()` means “parent only; else `null`.”  
Prefer a **single concrete type** per parameter; avoid unions like `Tracker | null` so metadata stays reliable.

## Property injection `@Prop(...)`

Besides constructors, **`@Prop`** writes values after construction.

```tsx
import { Injectable, InjectionToken, Prop } from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

@Injectable()
class RequestService {
  @Prop(API_URL)
  apiUrl!: string
}
```

`@Prop` supports **`notFoundValue`** and **`flags`** with the same semantics as `inject(...)`.  
Without a token argument, it infers from the property type—use **`forwardRef`** for mutually dependent / later-declared types.

## `forwardRef`: later-declared dependencies

When the dependency type is not yet defined at the declaration site, defer the token with **`forwardRef`**.

```tsx
import { Inject, Injectable, forwardRef } from '@viewfly/core'

@Injectable()
class AService {
  constructor(@Inject(forwardRef(() => BService)) readonly b: BService) {}
}

@Injectable()
class BService {}
```

If you see errors about ctor parameter types missing metadata, check for forward references without **`forwardRef`**.

## `scope`: named mounts and dynamic registration

Entry points:

- `@Injectable({ provideIn: 'root' | Scope })`
- `withAnnotation({ scope, providers })`
- `createContext(providers, scope)`

### Pattern: core defines `scope`, features mount on demand

Treat **`scope`** as a **named mount identifier**. With `@Injectable({ provideIn: someScope })`, the class need not appear in the root `provide(...)` list up front—it registers dynamically on first injection onto the injector that owns that **`Scope`** instance.

Fits **shell + feature module** setups:

- The shell declares and exports a lightweight **`Scope`** token without importing concrete feature services.
- Feature injectables reference that **`Scope`** for on-demand registration.
- The shell mounts the **`scope`** on the container that **hosts feature switching**, so shared services under that scope survive tab/route swaps inside the domain.

::: code-group

```tsx [app.tsx]
import { createSignal } from '@viewfly/core'
import { OrderModuleHost } from './module-host'
import { OrderPage } from './order-page'
import { OrderStatsPage } from './order-stats-page'

function App() {
  const tab = createSignal<
    'order' | 'stats'
  >('order')

  return () => (
    <OrderModuleHost>
      {/* Shared services under ORDER_SCOPE survive page switches */}
      {tab() === 'order'
        ? <OrderPage />
        : <OrderStatsPage />}
    </OrderModuleHost>
  )
}
```

```tsx [app-scopes.ts]
import { Scope } from '@viewfly/core'

// Shell exports one Scope instance for features to share
export const ORDER_SCOPE = new Scope('order')
```

```tsx [module-host.tsx]
import { withAnnotation } from '@viewfly/core'
import { ORDER_SCOPE } from './app-scopes'

export const OrderModuleHost = withAnnotation(
  // Mount the scope on the container above feature pages
  { scope: ORDER_SCOPE },
  function OrderModuleHost(props: { children?: any }) {
    return () => <>{props.children}</>
  },
)
```

```tsx [order-shared.service.ts]
import { Injectable } from '@viewfly/core'
import { ORDER_SCOPE } from './app-scopes'

// Registers against ORDER_SCOPE when first needed
@Injectable({ provideIn: ORDER_SCOPE })
export class OrderSharedService {
  count = 0
  increase() {
    this.count += 1
  }
}
```

```tsx [order-page.tsx]
import { inject } from '@viewfly/core'
import { OrderSharedService } from './order-shared.service'

export function OrderPage() {
  const shared = inject(OrderSharedService)
  return () => (
    <button onClick={() => shared.increase()}>
      {shared.count}
    </button>
  )
}
```

```tsx [order-stats-page.tsx]
import { inject } from '@viewfly/core'
import { OrderSharedService } from './order-shared.service'

export function OrderStatsPage() {
  const shared = inject(OrderSharedService)
  return () => <p>Count: {shared.count}</p>
}
```

:::

The synchronous tab switch only illustrates **where** the scope mounts. **In real apps, feature modules are often loaded async by the router.** The rule stays the same: mount **`scope`** on the shell container above feature switching; services already registered on that scope keep working inside the business domain.

### `provideIn: 'root'`

With `@Injectable({ provideIn: 'root' })`, you can inject without listing the class in root `provide(...)`—it registers dynamically and reuses a single instance.

```tsx
@Injectable({ provideIn: 'root' })
class AppConfigService {}
```

### `provideIn: Scope`

With `@Injectable({ provideIn: featureScope })`, resolution attaches to the **nearest injector carrying that `Scope` instance**. If no matching scope exists on the chain, it throws by default.

```tsx
import { Injectable, Scope } from '@viewfly/core'

const ORDER_SCOPE = new Scope('order')

@Injectable({ provideIn: ORDER_SCOPE })
class OrderSharedService {}
```

## `withAnnotation` vs `createContext`

All three carve DI boundaries, but serve different jobs:

| API | Role | Good for | Notes |
|-----|------|----------|-------|
| `withAnnotation` | Annotate a component | Module host components that always carry providers/scope | Tied to component definition; can inject current `Injector` |
| `createContext` | Reusable context component | Same provider bundle wrapped in many places | Flexible JSX placement; `scope` optional |
| `createContextProvider` | Single-token provider component | Frequent local overrides (`useValue` / `useClass` / …) | Minimal JSX for one token |

### 1) `withAnnotation`: boundary at definition time

```tsx
import { withAnnotation } from '@viewfly/core'

export const FeatureHost = withAnnotation(
  {
    providers: [FeatureService],
    scope: FEATURE_SCOPE,
  },
  function FeatureHost(props: { children?: any }) {
    return () => <>{props.children}</>
  },
)
```

- Natural when the component **is** the domain entry.
- Providers/scope travel with the definition—callers need not repeat props.
- Inner tree can inject **`Injector`** (advanced; next section).

### 2) `createContext`: reusable wrapper

```tsx
import { createContext } from '@viewfly/core'

const ThemeContext = createContext([ThemeService], THEME_SCOPE)

function App() {
  return () => (
    <>
      <ThemeContext><PageA /></ThemeContext>
      <ThemeContext><PageB /></ThemeContext>
    </>
  )
}
```

- One context component, many placements.
- Same rules, different subtrees.
- Omit `scope` for provider-only boundaries.

### 3) `createContextProvider`: override one token

```tsx
import { createContextProvider } from '@viewfly/core'

const LoggerProvider = createContextProvider({ provide: LoggerService })

function App() {
  return () => (
    <LoggerProvider useClass={ConsoleLogger}>
      <Page />
    </LoggerProvider>
  )
}
```

- Swap `useClass` / `useFactory` / `useValue` / `useExisting` inline.
- Best when one token changes often in JSX.

### Quick pick

- Module host component → **`withAnnotation`**
- Reusable provider bundle → **`createContext`**
- Single-token JSX overrides → **`createContextProvider`**

## Injecting `Injector` (advanced)

`withAnnotation` exposes the **`Injector`** token so you can grab the current container—useful for infra-style helpers.

```tsx
import { inject, Injector, withAnnotation } from '@viewfly/core'

const Panel = withAnnotation({}, function Panel() {
  const injector = inject(Injector)
  const logger = injector.get(LoggerService)
  return () => <div>{String(!!logger)}</div>
})
```

Prefer injecting concrete tokens in feature code; reserve **`Injector`** for generic DI plumbing.

## Multiple `@Inject` on one parameter

If several `@Inject(...)` decorators share one parameter, the **earliest in source order** wins:

```tsx
@Injectable()
class Main {
  constructor(@Inject(A) @Inject(B) public child: B) {}
}
// resolves A
```

Decorator ordering causes this—use **at most one** `@Inject(...)` per parameter.

## Common errors

### 1) `No provide for ...`

No provider on the chain and no **`notFoundValue`**.

- Register upstream of the component.
- Pass **`notFoundValue`** for optional behavior.
- Use **`InjectFlags.Self` / `SkipSelf`** to constrain lookup.

### 2) `Class xxx is not injectable!`

Class resolved as constructible but missing **`@Injectable()`**.

- Add **`@Injectable()`**, or provide via **`useFactory` / `useValue`**.

### 3) Custom `scope` not found

`provideIn: someScope` but no injector on the chain owns that scope.

- Mount with **`withAnnotation({ scope })`** or **`createContext(..., scope)`** upstream.

### 4) Same token description, different instances

```tsx
const A = new InjectionToken<string>('api')
const B = new InjectionToken<string>('api')
// A !== B
```

Export and reuse **one** token reference from a shared module.

## Larger projects

- Centralize tokens (e.g. `src/tokens/*`).
- Centralize provider modules (e.g. `user.providers.ts`); components only **`inject`**.
- In tests, prefer **`useValue` / `useFactory`** overrides to cut coupling and setup cost.

## Next steps

- [Dependency injection](./dependency-injection.md)
- [Application in depth](./application-in-depth.md)
