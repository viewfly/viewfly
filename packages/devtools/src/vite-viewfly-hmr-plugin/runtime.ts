/** Viewfly 开发态 HMR：wire + createNode capture；按 `hmrKey` 登记实例；热更时 bump flush、同步壳、`destroy` + `markAsDirtied`。 */

import type { Component, ComponentSetup, Props } from '@viewfly/core'
import { getCurrentInstance, JSXNodeFactory } from '@viewfly/core'

export interface ViewflyHmrAppLike {
  render(): unknown
  destroy(): void
  mount(container: unknown): unknown
}

const appByContainer = new WeakMap<object, ViewflyHmrAppLike>()

/** Vite 会给 `import.meta.url` 加 `?t=`，不规范化则 wire / accept / 实例 key 不一致。 */
export function canonicalHmrModuleUrl(url: string): string {
  const i = url.indexOf('?')
  return i === -1 ? url : url.slice(0, i)
}

/**
 * 包装应用实例的 `mount`：同一容器再次 mount 前先 `destroy` 旧实例（HMR 重跑入口时避免叠两套 UI）。
 * 不在 ESM 命名空间上改 `createApp`，由入口 AST 在调用 `createApp` 后注入本函数。
 */
export function patchApplicationMountForHmr(app: ViewflyHmrAppLike): void {
  const origMount = app.mount.bind(app)
  app.mount = function (container: unknown) {
    const prev = appByContainer.get(container as object)
    if (prev && prev !== app) {
      try {
        prev.destroy()
      } catch {
        /* ignore */
      }
    }
    const ret = origMount(container)
    appByContainer.set(container as object, app)
    registerViewflyHmrApp(() => app)
    return ret
  }
}

let getApp: (() => ViewflyHmrAppLike | null | undefined) | null = null

/** 每个 `hmrKey`（`canonicalUrl#ExportName`）独立递增；只热更 B 时不应 bump A/C。 */
const viewflyHmrFlushGenByKey = new Map<string, number>()

const instancesByKey = new Map<string, Set<Component>>()

/**
 * 同一 hmrKey 共用一个 bucket；但 **JSX 上的 inner 引用变化**（如 wire 每次热更换 proxy）时必须换新的
 * capture 外壳函数，否则 reconciler 认为 nodeType 未变，父级 viewRender 仍会复用旧子组件实例。
 */
const captureCellByKey = new Map<
  string,
  {
    wrap: ComponentSetup
    bucket: { latest: ComponentSetup }
    lastInner: ComponentSetup
    lastFlushGen: number
  }
>()
let createNodePatched = false

const moduleExportSlots = new Map<
  string,
  Map<string, { setLatest: (f: ComponentSetup) => void; wrapped: ComponentSetup }>
>()

function registerInstance(key: string, c: Component): void {
  let s = instancesByKey.get(key)
  if (!s) {
    s = new Set()
    instancesByKey.set(key, s)
  }
  s.add(c)
}

function resolveStableWrappedForKey(hmrKey: string): (ComponentSetup & { __vfHmrKey: string }) | null {
  const i = hmrKey.lastIndexOf('#')
  if (i <= 0) {
    return null
  }
  const canonUrl = hmrKey.slice(0, i)
  const exportName = hmrKey.slice(i + 1)
  const slot = moduleExportSlots.get(canonUrl)?.get(exportName)
  const w = slot?.wrapped
  if (typeof w !== 'function') {
    return null
  }
  return w as ComponentSetup & { __vfHmrKey: string }
}

/** 把树上已登记实例的 `type` / `atom.nodeType` 对齐到当前 capture 壳，避免父热更后子槽 `nodeType` 不一致而整段重建。 */
function syncRegisteredInstancesShell(hmrKey: string): void {
  const wrapped = resolveStableWrappedForKey(hmrKey)
  if (!wrapped) {
    return
  }
  const shell = getOrCreateCaptureWrap(wrapped, hmrKey)
  const set = instancesByKey.get(hmrKey)
  if (!set) {
    return
  }
  for (const c of set) {
    const comp = c as Component & { type: ComponentSetup }
    comp.type = shell
    const atom = comp.viewMetadata?.atom as undefined | { nodeType: ComponentSetup }
    if (atom) {
      atom.nodeType = shell
    }
  }
}

function runCaptureWrapRender(
  hmrKey: string,
  bucket: { latest: ComponentSetup },
  props: unknown,
): ReturnType<ComponentSetup> {
  const inst = getCurrentInstance()
  if (inst) {
    registerInstance(hmrKey, inst)
  }
  return bucket.latest(props as never) as ReturnType<ComponentSetup>
}

function markKeyDirty(key: string): void {
  viewflyHmrFlushGenByKey.set(key, (viewflyHmrFlushGenByKey.get(key) ?? 0) + 1)
  syncRegisteredInstancesShell(key)
  const s = instancesByKey.get(key)
  if (!s) {
    return
  }
  for (const c of [...s]) {
    c.destroy()
    c.markAsDirtied()
  }
}

function getOrCreateCaptureWrap(
  inner: ComponentSetup & { __vfHmrKey: string },
  hmrKey: string,
): ComponentSetup {
  let cell = captureCellByKey.get(hmrKey)
  if (!cell) {
    const flushGen = viewflyHmrFlushGenByKey.get(hmrKey) ?? 0
    const bucket = { latest: inner }
    const wrap: ComponentSetup = function captureWrap(props: unknown) {
      return runCaptureWrapRender(hmrKey, bucket, props)
    }
    Object.assign(wrap, { __vfHmrKey: hmrKey })
    cell = { wrap, bucket, lastInner: inner, lastFlushGen: flushGen }
    captureCellByKey.set(hmrKey, cell)
    return wrap
  }
  cell.bucket.latest = inner
  const currentGen = viewflyHmrFlushGenByKey.get(hmrKey) ?? 0
  const needNewShell = cell.lastFlushGen !== currentGen || cell.lastInner !== inner
  if (needNewShell) {
    cell.lastFlushGen = currentGen
    cell.lastInner = inner
    const wrap2: ComponentSetup = function captureWrap(props: unknown) {
      return runCaptureWrapRender(hmrKey, cell!.bucket, props)
    }
    Object.assign(wrap2, { __vfHmrKey: hmrKey })
    cell.wrap = wrap2
  }
  return cell.wrap
}

/**
 * 须在任意 `<Foo />` 渲染之前调用一次：劫持 `JSXNodeFactory.createNode`，对带 `__vfHmrKey` 的组件 type 包一层以采集实例。
 */
export function installViewflyHmrCreateNodePatch(): void {
  if (createNodePatched) {
    return
  }
  createNodePatched = true
  const original = JSXNodeFactory.createNode.bind(JSXNodeFactory)
  JSXNodeFactory.createNode = function (
    type: string | ComponentSetup,
    props: Props & Record<string, unknown>,
    key?: unknown,
  ) {
    let t = type
    if (typeof t === 'function') {
      const hmrKey = (t as { __vfHmrKey?: string }).__vfHmrKey
      if (hmrKey) {
        t = getOrCreateCaptureWrap(t as ComponentSetup & { __vfHmrKey: string }, hmrKey)
      }
    }
    return original(t as never, props as never, key as never)
  } as typeof JSXNodeFactory.createNode
}

/** 挂载后注册 app，供 `viewflyHmrAcceptSelf` 里 `render()` 刷帧。 */
export function registerViewflyHmrApp(getter: () => ViewflyHmrAppLike | null | undefined): void {
  getApp = getter
}

/**
 * 对导出函数包一层稳定引用；路由/根组件须使用该对象上的属性。
 */
export function wireViewflyHmrModule(moduleUrl: string, exportsObj: Record<string, unknown>): void {
  const canonUrl = canonicalHmrModuleUrl(moduleUrl)
  let meta = moduleExportSlots.get(canonUrl)
  if (!meta) {
    meta = new Map()
    moduleExportSlots.set(canonUrl, meta)
  }
  for (const name of Object.keys(exportsObj)) {
    const fn = exportsObj[name]
    if (typeof fn !== 'function') {
      continue
    }
    if ((fn as { __vfHmrKey?: string }).__vfHmrKey) {
      continue
    }
    const key = `${canonUrl}#${name}`
    const prev = meta.get(name)
    if (prev) {
      prev.setLatest(fn as ComponentSetup)
      /* 始终暴露首次 wire 的同一 `wrapped`，否则父文件热更连带子模块 wire 时 `nodeType` 引用漂移会重建子组件。 */
      ;(exportsObj as Record<string, unknown>)[name] = prev.wrapped as unknown
      syncRegisteredInstancesShell(key)
      continue
    }
    let latest = fn as ComponentSetup
    function wrapped(props: unknown) {
      return (latest as (p: unknown) => unknown)(props)
    }
    const setLatest = (f: ComponentSetup) => {
      latest = f
    }
    Object.assign(wrapped, {
      __vfHmrKey: key,
    })
    ;(exportsObj as Record<string, unknown>)[name] = wrapped as unknown
    meta.set(name, { setLatest, wrapped: wrapped as ComponentSetup })
  }
}

/** `accept` 回调：勿用 `mod[name]` 更新实现（多为 stable wrap）；`setLatest` 已在模块重跑时的 `wire` prev 分支完成。 */
function applyViewflyHmrModuleUpdate(moduleUrl: string, mod: Record<string, unknown>): boolean {
  const canonUrl = canonicalHmrModuleUrl(moduleUrl)
  const meta = moduleExportSlots.get(canonUrl)
  if (!meta) {
    return false
  }
  let hit = false
  for (const name of meta.keys()) {
    if (!(name in mod) || typeof mod[name] !== 'function') {
      continue
    }
    markKeyDirty(`${canonUrl}#${name}`)
    hit = true
  }
  return hit
}

/**
 * 由插件注入：`import.meta.hot.accept((mod) => ...)`。
 */
export function viewflyHmrAcceptSelf(moduleUrl: string, mod?: Record<string, unknown>): void {
  let subtree = false
  if (mod && typeof mod === 'object') {
    subtree = applyViewflyHmrModuleUpdate(moduleUrl, mod)
  }
  if (getApp) {
    if (subtree) {
      queueMicrotask(() => {
        getApp?.()?.render()
      })
    } else {
      getApp()?.render()
    }
  }
}
