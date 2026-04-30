# 依赖注入

很多初学者在组件里会直接 `new` 服务或直接引入全局单例，短期能跑，但项目一变复杂就会遇到这些问题：

- 组件里既写业务又写依赖创建，职责混在一起，代码越来越重；
- 想替换实现（例如线上/测试日志器）时，要改很多地方；
- 测试时很难注入替身对象（mock，指“用于测试的模拟实现”），导致测试成本高。

依赖注入（DI）就是为了解决这类问题：  
**把“依赖如何创建/替换”从组件业务逻辑里分离出来**，组件只负责“拿来用”。

把它放到实际流程里理解会更直观：先在上游把依赖注册好，组件里再按 token（依赖标识符）或类型声明“我需要什么”，最后由容器（负责管理依赖的对象）在运行时把对应实例交给组件。

什么时候优先考虑 DI：

- 依赖需要跨组件复用；
- 依赖实现需要按环境/场景切换；
- 你希望代码更易测试、可维护。

在 Viewfly 里，先掌握一个最小流程就够用：**定义 -> 注册 -> 注入**。

## 环境准备

依赖注入示例里会用到 `@Injectable()` 等装饰器；在 TypeScript 项目中，先确认以下编译选项已开启：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

并确保 `reflect-metadata` 在 DI 代码执行前已加载（通常从 `@viewfly/core` 主入口导入即可；异常时可在入口最前手动 `import 'reflect-metadata'`）。

- `reflect-metadata`：用于在运行时读取 TypeScript 装饰器产生的类型元数据（metadata）。

### 构建打包注意

按下面步骤配置，确保装饰器 metadata 在运行时可用：

1. 在 `tsconfig.json` 开启：
   - `experimentalDecorators: true`
   - `emitDecoratorMetadata: true`
2. 在应用入口最前确保加载 `reflect-metadata`（通常由 `@viewfly/core` 主入口完成；异常时手动补 `import 'reflect-metadata'`）。
3. 如果使用 Vite，给构建链路接入可产出 metadata 的编译插件（推荐 SWC 或 Babel）。
4. 用本页“最小闭环”示例做一次运行验证，确认注入可正常工作。

#### 方案 A：Vite + SWC

先安装依赖：

```bash
npm install -D vite-plugin-swc-transform
```

在 `vite.config.ts` 接入 SWC，并开启装饰器 metadata：

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

#### 方案 B：Vite + Babel

若你项目里已经有 Babel 管线，也可以使用 Babel 方案：

```bash
npm install -D @babel/core @babel/plugin-proposal-decorators babel-plugin-transform-typescript-metadata vite-plugin-babel
```

`vite.config.ts` 示例：

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

## 最小闭环：定义 -> 注册 -> 使用

这三步对应的是三个不同职责，拆开后代码更容易维护：

- **定义**：明确“这个依赖是什么”（类或 token），让依赖关系可读、可替换。
- **注册**：明确“实例从哪里来”（根级或局部 provider），把创建逻辑集中管理。
- **使用**：在组件主体通过 `inject(...)` 获取依赖，只关心业务调用，不关心构建细节。

为什么要这样做：  
如果把“创建依赖 + 使用依赖”全写在组件里，组件会越来越重，测试替换也困难；拆成这三步后，业务代码和装配代码分离，重用与测试都会更轻松。

```tsx
import { Injectable, inject } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

// 1) 定义：声明可注入的依赖类型
@Injectable()
class UserService {
  getName() {
    return 'Viewfly'
  }
}

function Child() {
  // 3) 使用：在组件主体注入依赖并直接调用
  const userService = inject(UserService)
  return () => <p>{userService.getName()}</p>
}

createApp(<Child />)
  // 2) 注册：在应用启动时把依赖交给容器管理
  .provide(UserService)
  .mount(document.getElementById('app')!)
```

## 注册位置：根级 or 局部

实际开发里经常会遇到这个问题：  
**某个服务到底应该全应用共享，还是只在某个页面/模块内生效？**

- 如果你希望“整个应用都拿到同一份服务实例”（例如全局配置、全局日志器），用**根级注册**。
- 如果你希望“只在某段子树可见，离开这段页面就不生效”（例如某业务模块的临时状态服务），用**局部注册**。

### 根级注册

问题场景：你不想在多个页面重复注册同一个服务，也不希望它随局部页面切换而丢失。

解决方式：在应用启动时用 `createApp(...).provide(...)` 一次性注册。

```tsx
createApp(<App />)
  .provide([AService, BService])
  .mount(document.getElementById('app')!)
```

### 局部注册

问题场景：你只想让某个业务区块拿到服务，避免把依赖泄漏到整棵应用树。

解决方式：用 `createContext([...])` 包住目标子树，依赖只在这段树内可注入。

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

简化理解：

- 根级注册：默认“全局共享”。
- 局部注册：默认“子树隔离”。

## 实例复用规则

依赖是否复用，取决于是否在**同一个 Injector** 内解析：

- 同一 Injector：同一 token 首次创建后会缓存，后续复用。
- 子级若重新提供同一 token：优先使用子级（就近覆盖）。
- 平行子树：即使 provider 写法相同，也通常不是同一个实例。

这也是为什么根级 `provide` 更像“应用级单例”，而 `createContext` 更像“局部单例”。

## 在组件树里做局部依赖边界

### 1) `withAnnotation`

要解决的问题：你在定义一个“模块宿主组件”，希望它天然带上一组 providers。

```tsx
import { withAnnotation } from '@viewfly/core'

export const FeatureHost = withAnnotation(
  { providers: [FeatureService] },
  function FeatureHost(props: { children?: any }) {
    return () => <>{props.children}</>
  },
)
```

要点：适合“组件定义时就固定 DI 边界”的场景。

### 2) `createContext`

要解决的问题：你想把一组依赖做成“可复用容器”，在多处包裹不同子树。

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

要点：适合“同一组 providers 在多个位置重复使用”。

### 3) `createContextProvider`

要解决的问题：你只想在局部覆盖一个 token（例如切换日志实现），不想每次都手写 `createContext([...])`。

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

要点：适合“单 token 高频覆盖”的场景。

快速判断：

- 你在定义一个“模块宿主组件” -> `withAnnotation`
- 你要复用同一组容器 -> `createContext`
- 你要局部替换单个 token -> `createContextProvider`

## 常见 Provider 写法

`app.provide(...)` / `createContext([...])` 接收 `Provider` 或 `Provider[]`。  
`Provider` 可以理解成“告诉 DI 容器：某个依赖该怎么创建”的配置对象。  
基础开发里最常用下面 4 种：

### 1) 直接传类（`TypeProvider`）

适合“这个类本身就是默认实现”的场景。

```tsx
@Injectable()
class UserService {}

createApp(<App />)
  .provide(UserService)
  .mount(document.getElementById('app')!)
```

要点：类本身同时作为 `provide` 与 `useClass`。

### 2) 固定值（`ValueProvider`）

适合配置常量、已构建好的对象、环境变量映射等场景。

```tsx
import { InjectionToken } from '@viewfly/core'

const API_URL = new InjectionToken<string>('api-url')

createApp(<App />)
  .provide({ provide: API_URL, useValue: '/api' })
  .mount(document.getElementById('app')!)
```

要点：`useValue` 直接给值，不会走类实例化逻辑。

### 3) 类映射（`ClassProvider`）

适合“对外用统一 token，对内按环境切换实现”的场景。

```tsx
createApp(<App />)
  .provide({
    provide: LoggerService,
    useClass: ConsoleLoggerService,
  })
  .mount(document.getElementById('app')!)
```

要点：消费方始终 `inject(LoggerService)`，实现可在注册处替换。

### 4) 工厂创建（`FactoryProvider`）

适合“创建逻辑需要参数组装或条件判断”的场景。

```tsx
createApp(<App />)
  .provide({
    provide: SessionService,
    useFactory: () => new SessionService('guest'),
  })
  .mount(document.getElementById('app')!)
```

要点：当实例构建依赖多参数、环境分支时，`useFactory` 往往比 `useClass` 更直观。

### 组合注册

实际项目通常会混合多种 provider：

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

同一层 `Provider[]` 里，**后声明覆盖前声明**：

```tsx
createApp(<App />)
  .provide([
    { provide: LoggerService, useClass: ConsoleLoggerService },
    { provide: LoggerService, useClass: RemoteLoggerService }, // 生效
  ])
  .mount(document.getElementById('app')!)
```

## `inject(...)` 的调用位置

`inject(...)` 必须在**组件主体**调用，不要放进渲染函数：

```tsx
function Profile() {
  const userService = inject(UserService)
  return () => <p>{userService.getName()}</p>
}
```

## 常见问题

1. **在渲染函数里调用 `inject`**：改到组件主体。  
2. **先使用后注册 provider**：保证 `provide` / `createContext` 先于组件渲染。  
3. **token 看起来一样但不是同一个引用**：统一从一个模块导出复用。  
4. **需要业务域隔离或动态挂载规则**：请直接阅读 [深入依赖注入](./dependency-injection-in-depth.md) 中的相关章节。

## 需要更细规则时

下面这些进阶内容都在 [深入依赖注入](./dependency-injection-in-depth.md)：

- `inject(token, notFoundValue?, flags?)` 全参数语义
- `deps` 优先级与参数装饰器（`@Inject/@Optional/@Self/@SkipSelf`）
- `forwardRef`、`@Prop` 与业务域隔离相关规则

## 下一步

- [创建应用](./essentials-application.md)
- [路由](./router.md)
- [深入依赖注入](./dependency-injection-in-depth.md)
