# 深入依赖注入

本页在 [依赖注入](./dependency-injection.md) 的基础上，完整说明 Viewfly DI 的运行时规则：`Provider` 解析、实例缓存、注入标志、参数装饰器、`scope` 挂载与查找边界。

## 阅读指引

这章内容比较多，可以按你的问题类型来读：  
如果你主要想弄清楚注入查找行为，先看 `inject(token, notFoundValue?, flags?)`；如果你在调 `deps` 或构造参数装饰器，先看 `deps` 优先级和参数装饰器小节；如果报后声明类型相关错误，优先看 `forwardRef`；如果在做模块边界与隔离，再看 `scope` 章节。线上问题排查可直接跳到文末“常见错误与修复”。

## 运行时流程总览

从运行时看，`inject(...)` 会经历这几步：

1. 从当前组件开始，向上找到最近的 `Injector`（依赖注入容器）。
2. 按查找规则（默认 / `Self` / `SkipSelf`）决定从哪一层容器开始找。
3. 找到 provider 后，解析其依赖参数，再创建实例。
4. 当前 `Injector` 缓存该 token 的值，后续同容器重复注入会复用。
5. 如果没找到且没有可用回退值（`notFoundValue`），则抛错。

这个流程解释了文档里最常见的三个现象：为什么“就近覆盖”生效、为什么同容器是单例、为什么有时会出现 `No provide for ...` 错误（表示当前查询链找不到对应 provider）。

## 实例缓存与生存范围

是否复用同一实例，取决于是否在**同一个 Injector** 内解析：

- 同一个 Injector 内，同一 token 首次创建后会缓存，后续复用。
- 子 Injector 若也提供了同一 token，会覆盖父级解析结果（就近原则）。
- 两个平行子树即使 provider 写法一样，只要 Injector 不同，实例也不同。

这就是为什么“根 provide 看起来像全局单例，局部 context 更像局部单例”。

## Provider 全类型与解析规则

基础写法（`Type/Class/Value/Factory/Existing/Constructor`）已在 [依赖注入](./dependency-injection.md) 逐项示例。  
本页只关注“容易踩坑的解析规则”：

- 同一层 `Provider[]`：后声明覆盖前声明。
- `ValueProvider` / `ExistingProvider` 不解析 `deps`。
- `ClassProvider` 写了 `deps` 后，优先按 `deps`，不再按构造参数自动推断。
- `FactoryProvider` 只按 `deps` 顺序传参，不按参数类型自动匹配。

### `deps` 的优先级

先记一条总规则：**`deps` 是“显式参数清单”，写了就按你写的执行。**

#### 1) 哪些 Provider 支持 `deps`

- 支持：`ClassProvider` / `FactoryProvider` / `ConstructorProvider`
- 不支持：`ValueProvider` / `ExistingProvider`（写了也不会解析）

```tsx
app.provide([
  { provide: A, useValue: 1 }, // deps 不生效
  { provide: B, useExisting: A }, // deps 不生效
  {
    provide: C,
    useFactory: (a: number) => a + 1,
    deps: [A], // deps 生效
  },
])
```

#### 2) `ClassProvider`：显式 `deps` > 自动推断

`ClassProvider` 不写 `deps` 时，会走构造函数元数据推断；一旦写了 `deps`，就只按 `deps`。

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
  // 这里即使构造参数里还有 LoggerService，也优先按 deps 解析
  {
    provide: ClientService,
    useClass: ClientService,
    deps: [API_URL, LoggerService],
  },
])
```

#### 3) `FactoryProvider`：只看 `deps` 顺序

`useFactory(a, b, c)` 的参数顺序，必须和 `deps: [A, B, C]` 一一对应，不会自动按类型猜。

```tsx
app.provide([
  { provide: API_URL, useValue: '/api' },
  { provide: LoggerService, useClass: ConsoleLogger },
  {
    provide: SessionService,
    useFactory: (url: string, logger: LoggerService) =>
      new SessionService(url, logger),
    deps: [API_URL, LoggerService], // 顺序必须和参数一致
  },
])
```

#### 4) `deps` 单项可以写什么

- 直接 token：`UserService`、`API_URL`
- 装饰器数组：`[UserService, new Optional()]`、`[new Inject(API_URL)]`
- 后声明类型：`forwardRef(() => UserService)`

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

当你需要精确控制依赖来源（例如“必须本层”“找不到返回 null”“后声明类型”）时，显式 `deps` 比自动推断更可控。

## `inject(token, notFoundValue?, flags?)` 全参数语义

`inject` 除了 token，还可以控制“找不到时怎么办”和“如何查找”。

```tsx
import { InjectFlags, inject } from '@viewfly/core'

function Demo() {
  const localOnly = inject(LocalService, null, InjectFlags.Self)
  const fromParent = inject(ThemeService, null, InjectFlags.SkipSelf)
  const fallback = inject(API_CONFIG, { baseUrl: '/api' })

  return () => <div />
}
```

- `notFoundValue`：最终没找到 token 时返回该值；不传时默认抛错。
- `flags` 控制查找边界与起点：

| flags | 含义 | 常见用途 |
|------|------|----------|
| `InjectFlags.Default` | 从当前容器开始，找不到继续向上 | 常规注入 |
| `InjectFlags.Self` | 只查当前容器，不向上 | 强制本层依赖 |
| `InjectFlags.SkipSelf` | 跳过当前容器，从父容器开始 | 强制拿父级实现 |
| `InjectFlags.Optional` | 允许进入“查不到”的可选分支 | 常配合 `notFoundValue` |

在业务代码里，最稳妥的“可选注入”写法通常是：显式传 `notFoundValue`（例如 `null`）。

例如你希望“仅在当前容器查找，找不到返回 `null`”：

```tsx
import { InjectFlags, inject } from '@viewfly/core'

function Toolbar() {
  const localTracker = inject(TrackerService, null, InjectFlags.Self | InjectFlags.Optional)
  return () => <div>{localTracker ? 'has tracker' : 'no tracker'}</div>
}
```

这类写法把“查找范围（`Self`）”和“缺失回退（`notFoundValue`）”都写在调用点，行为最直观。

## 构造函数参数装饰器：精确控制依赖解析

Viewfly 为构造函数参数提供四个 DI 装饰器：

- `@Inject(token)`：把该参数改为指定 token（覆盖默认类型推断）。
- `@Self()`：仅从当前容器解析该参数。
- `@SkipSelf()`：从父容器开始解析该参数。
- `@Optional()`：该参数允许缺失，缺失时注入 `null`。

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

当单个参数上组合多个装饰器时，行为是叠加的：例如 `@SkipSelf() + @Optional()` 表示“只从父级找，找不到返回 `null`”。
另外，构造参数建议保持单一类型，不要写 `Tracker | null` 这类联合类型，以避免注入元数据变得不准确。

## 属性注入 `@Prop(...)`

除了构造函数注入，还可以使用属性装饰器 `@Prop`。属性会在实例创建后由容器写入。

```tsx
import { Injectable, InjectionToken, Prop } from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

@Injectable()
class RequestService {
  @Prop(API_URL)
  apiUrl!: string
}
```

`@Prop` 也支持 `notFoundValue` 与 `flags`，参数语义与 `inject(...)` 一致。  
另外，`@Prop()` 不传 token 时会按属性类型元数据推断，遇到后声明类型时同样建议用 `forwardRef`。

## `forwardRef`：处理后声明依赖

当依赖类型在当前声明点“还没定义”时，可用 `forwardRef` 延迟解析 token。

```tsx
import { Inject, Injectable, forwardRef } from '@viewfly/core'

@Injectable()
class AService {
  constructor(@Inject(forwardRef(() => BService)) readonly b: BService) {}
}

@Injectable()
class BService {}
```

如果你遇到“构造参数类型未获取到”的错误，第一检查点就是是否存在后声明类型却未使用 `forwardRef`。

## `scope`：具名挂载点与动态注册

`scope` 的入口有三个：

- `@Injectable({ provideIn: 'root' | Scope })`
- `withAnnotation({ scope, providers })`
- `createContext(providers, scope)`

### 重点应用场景：主模块定义 scope，业务模块按需挂载

`scope` 可以看作“具名挂载点标识”。当一个类写了 `@Injectable({ provideIn: someScope })` 后，它不必在启动阶段显式写进根 `provide(...)` 列表，而是在首次被注入时，动态挂到注入树上匹配该 `Scope` 实例的 `Injector` 中。

这个能力最适合“主模块 + 业务模块”解耦场景：

- 主模块声明并导出轻量 `Scope` 标识，不直接引用业务服务类；
- 业务模块里的可注入类引用这个 `Scope`，即可具备按需动态注册能力；
- 主模块在“承载业务模块切换”的上层容器挂载该 `scope`，这样切换子模块时仍可共享同一份服务实例。

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
      {/* 切换子页面时，ORDER_SCOPE 下的共享服务仍可复用 */}
      {tab() === 'order'
        ? <OrderPage />
        : <OrderStatsPage />}
    </OrderModuleHost>
  )
}
```

```tsx [app-scopes.ts]
import { Scope } from '@viewfly/core'

// 主模块定义并导出同一个 Scope 实例，供业务模块复用
export const ORDER_SCOPE = new Scope('order')
```

```tsx [module-host.tsx]
import { withAnnotation } from '@viewfly/core'
import { ORDER_SCOPE } from './app-scopes'

export const OrderModuleHost = withAnnotation(
  // 关键：把 scope 挂在承载业务子模块的上层容器
  { scope: ORDER_SCOPE },
  function OrderModuleHost(props: { children?: any }) {
    return () => <>{props.children}</>
  },
)
```

```tsx [order-shared.service.ts]
import { Injectable } from '@viewfly/core'
import { ORDER_SCOPE } from './app-scopes'

// 声明该服务按 ORDER_SCOPE 动态挂载
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
  // 业务页面只消费，不关心注册细节
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
  return () => <p>当前计数：{shared.count}</p>
}
```

:::

上面用同步切换页面只是为了突出 `scope` 挂载位置。<strong>在真实项目里，业务模块通常由路由按需异步加载。</strong>实践上仍是同一个原则：把 `scope` 挂载点放在主模块的业务承载容器上层，路由切换到不同子模块时，已挂载到该 `scope` 的共享服务仍可在该业务域内复用。

### `provideIn: 'root'`

声明 `@Injectable({ provideIn: 'root' })` 后，即使你没有手动把该类写到根 `provide(...)` 里，也可以在注入时动态注册并复用。

```tsx
@Injectable({ provideIn: 'root' })
class AppConfigService {}
```

### `provideIn: Scope`

声明 `@Injectable({ provideIn: featureScope })` 后，容器会尝试把它挂到**最近的同一个 `Scope` 实例容器**。若链路中没有匹配 scope，默认会抛错。

```tsx
import { Injectable, Scope } from '@viewfly/core'

const ORDER_SCOPE = new Scope('order')

@Injectable({ provideIn: ORDER_SCOPE })
class OrderSharedService {}
```

## `withAnnotation` 与 `createContext` 的差异

先看结论：这三个 API 都能创建 DI 边界，但定位不同。

| API | 更像什么 | 适合场景 | 关键特性 |
|-----|----------|----------|----------|
| `withAnnotation` | 给某个组件“加注解” | 你正在定义一个组件，并希望它天然带 providers/scope | 与组件定义强绑定；可注入当前 `Injector` |
| `createContext` | 创建一个“上下文容器组件” | 需要把同一组 providers 在多个位置重复包裹 | 容器可复用，可按 JSX 结构灵活放置 |
| `createContextProvider` | 单 token 的专用 Provider 组件 | 经常在局部覆盖某一个 token（`useValue/useClass/...`） | JSX 里使用最直观，覆盖粒度最细 |

### 1) `withAnnotation`：组件定义时就绑定 DI 边界

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

特点：

- 适合“组件天生就是一个业务域入口”的场景；
- provider/scope 跟组件定义走，调用方无需重复传入；
- 该边界内可注入 `Injector`（见下一节高级能力）。

### 2) `createContext`：把 DI 边界做成可复用容器

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

特点：

- 同一个 Context 组件可在多处复用；
- 适合“同一规则包裹不同子树”的场景；
- `scope` 可选，不传则只建立 provider 边界。

### 3) `createContextProvider`：专门覆盖单个 token

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

特点：

- 在 JSX 中按需覆盖 `useClass/useFactory/useValue/useExisting`；
- 适合“某个 token 在局部频繁切换实现”的场景；
- 相比直接写 `createContext([...])`，调用更聚焦、心智更轻。

### 选型建议（快速判断）

- 你在“定义一个模块宿主组件” -> 优先 `withAnnotation`
- 你要“复用一组 provider 容器” -> 优先 `createContext`
- 你要“只覆盖一个 token，且频繁在 JSX 调整” -> 优先 `createContextProvider`

## 注入 `Injector` 本身（高级能力）

`withAnnotation` 创建的容器会额外提供 `Injector` token，因此你可以注入当前容器本身，做框架级或基础设施封装。

```tsx
import { inject, Injector, withAnnotation } from '@viewfly/core'

const Panel = withAnnotation({}, function Panel() {
  const injector = inject(Injector)
  const logger = injector.get(LoggerService)
  return () => <div>{String(!!logger)}</div>
})
```

这属于高级用法。业务模块里优先直接注入业务 token，只有在需要做通用 DI 封装时再注入 `Injector`。

## 装饰器冲突规则（易忽略）

同一个构造参数上如果写了多个 `@Inject(...)`，以**书写顺序更靠前**的装饰器为准：

```tsx
@Injectable()
class Main {
  constructor(@Inject(A) @Inject(B) public child: B) {}
}
// 实际注入 A
```

该行为来自装饰器执行顺序。建议一个参数只保留一个 `@Inject(...)`，避免歧义。

## 常见错误与修复

### 1) `No provide for ...`

含义：当前查询链没有可用 provider，且没有提供 `notFoundValue`。  
修复：

- 确认 provider 是否在当前组件上游注册；
- 需要可选行为时传 `notFoundValue`；
- 需要只查本层或只查父层时，配合 `InjectFlags.Self/SkipSelf`。

### 2) `Class xxx is not injectable!`

含义：该类被当作可构造依赖解析，但类上没有 `@Injectable()` 元数据。  
修复：为该类添加 `@Injectable()`，或改为 `useFactory/useValue` 提供。

### 3) 自定义 `scope` 找不到

含义：声明了 `provideIn: someScope`，但 injector 链上不存在该 `scope`。  
修复：在正确上游通过 `withAnnotation({ scope })` 或 `createContext(..., scope)` 建立挂载点。

### 4) token 描述相同但实例不同

```tsx
const A = new InjectionToken<string>('api')
const B = new InjectionToken<string>('api')
// A !== B
```

修复：统一从同一个 `tokens` 模块导出并复用 token 引用。

## 工程化建议（大项目）

- token 集中导出（例如 `src/tokens/*`），避免重复创建 token。
- provider 装配集中（例如 `user.providers.ts`），组件只写 `inject` 和业务逻辑。
- 测试优先用 `useValue` / `useFactory` 覆盖真实依赖，减少耦合与初始化成本。

## 下一步

- [依赖注入](./dependency-injection.md)
- [应用深入](./application-in-depth.md)
