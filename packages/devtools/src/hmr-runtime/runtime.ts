import type { Component } from '@viewfly/core'
import {
  getCurrentInstance,
  JSXNodeFactory,
  onMounted,
  onUnmounted,
} from '@viewfly/core'
import * as coreNamespace from '@viewfly/core'

type HotHolder = {
  impl: (props: any) => any
  instances: Set<Component>
}

type HotEntry = {
  holder: HotHolder
  wrapper: (props: any) => any
  lastDigest?: string
}

const implHotMeta = new WeakMap<
  Function,
  { exportName: string; moduleUrl: string; digest?: string }
>()

/**
 * Vite 等在 HMR 时会给 `import.meta.url` 加上 `?t=...`。若直接把原始 URL 拼进缓存 key，
 * 会与首次挂载时的 key 不一致，从而误判为新组件、新建的 wrapper 上没有已挂载实例，页面不刷新。
 */
function normalizeHotModuleUrl(raw: string): string {
  if (!raw) {
    return raw
  }
  try {
    if (typeof URL !== 'undefined') {
      const u = new URL(raw, 'http://vite-hmr.local/')
      u.search = ''
      u.hash = ''
      return u.href
    }
  } catch {
    // ignore
  }
  const q = raw.indexOf('?')
  return q === -1 ? raw : raw.slice(0, q)
}

function getCache(): Map<string, HotEntry> {
  const g = globalThis as typeof globalThis & { __VF_HMR_CACHE__?: Map<string, HotEntry> }
  if (!g.__VF_HMR_CACHE__) {
    g.__VF_HMR_CACHE__ = new Map()
  }
  return g.__VF_HMR_CACHE__
}

let rerunImpl: ((c: Component) => void) | null = null

const pendingHot = new Set<Component>()
let flushScheduled = false

function scheduleHotFlush(): void {
  if (flushScheduled) {
    return
  }
  flushScheduled = true
  queueMicrotask(() => {
    flushScheduled = false
    const run = rerunImpl
    if (!run) {
      pendingHot.clear()
      return
    }
    pendingHot.forEach((c) => {
      run(c)
    })
    pendingHot.clear()
  })
}

function queueEntryRefresh(entry: HotEntry): void {
  entry.holder.instances.forEach((c) => {
    pendingHot.add(c)
  })
  scheduleHotFlush()
}

/**
 * 由 Babel 在模块初始化时对「热边界」实现函数调用；不在此处创建 wrapper，
 * wrapper 在首次 JSX `createNode` 时通过 {@link __vfResolveHotFromJsx} 生成，便于与 `JSXNodeFactory` 补丁协同。
 */
export function __vfMarkHotImpl(
  impl: (props: any) => any,
  exportName: string,
  moduleUrl: string,
  digest?: string,
): void {
  implHotMeta.set(impl, {
    exportName,
    moduleUrl: normalizeHotModuleUrl(moduleUrl),
    digest,
  })
}

function createHotWrapper(id: string, holder: HotHolder, digest: string | undefined, entry: HotEntry): void {
  function wrapper(props: any) {
    onMounted(() => {
      const inst = getCurrentInstance()
      holder.instances.add(inst)
      onUnmounted(() => {
        holder.instances.delete(inst)
      })
    })
    return holder.impl(props)
  }
  ;(wrapper as { __vfHotId?: string }).__vfHotId = id
  entry.holder = holder
  entry.wrapper = wrapper
  entry.lastDigest = digest
}

export function __vfResolveHotFromJsx(impl: Function): Function {
  const meta = implHotMeta.get(impl)
  if (!meta) {
    return impl
  }
  const id = `${meta.moduleUrl}#${meta.exportName}`
  const cache = getCache()
  let entry = cache.get(id)
  if (!entry) {
    const holder: HotHolder = { impl: impl as (props: any) => any, instances: new Set() }
    entry = { holder, wrapper: impl as (props: any) => any }
    createHotWrapper(id, holder, meta.digest, entry)
    cache.set(id, entry)
    return entry.wrapper
  }
  if (meta.digest !== undefined && entry.lastDigest === meta.digest) {
    entry.holder.impl = impl as (props: any) => any
    return entry.wrapper
  }
  entry.holder.impl = impl as (props: any) => any
  if (meta.digest !== undefined) {
    entry.lastDigest = meta.digest
  }
  queueEntryRefresh(entry)
  return entry.wrapper
}

let installDone = false
let patchedJsxCreateNode = false
let patchedCreateRendererExport = false

function patchJsxCreateNode(): void {
  if (patchedJsxCreateNode) {
    return
  }
  patchedJsxCreateNode = true
  const orig = JSXNodeFactory.createNode
  JSXNodeFactory.createNode = function (type, props, key) {
    if (typeof type === 'function') {
      type = __vfResolveHotFromJsx(type) as typeof type
    }
    return orig.call(JSXNodeFactory, type, props, key)
  } as typeof orig
}

/**
 * 猴子补丁：`createRenderer` 包装为在真正创建渲染器前保证 HMR 安装已执行（应对 import 顺序异常）。
 */
function patchCreateRendererExport(): void {
  if (patchedCreateRendererExport) {
    return
  }
  patchedCreateRendererExport = true
  const orig = coreNamespace.createRenderer
  Object.defineProperty(coreNamespace, 'createRenderer', {
    configurable: true,
    enumerable: true,
    writable: true,
    value(...args: Parameters<typeof orig>) {
      installViewflyHmr()
      return (orig as (...a: Parameters<typeof orig>) => ReturnType<typeof orig>).apply(coreNamespace, args)
    },
  })
}

/**
 * 将 HMR 挂到 `globalThis.__VF_HMR__`（由 `@viewfly/core` 的 `createRenderer` 调用 `captureRerender`）、
 * 并补丁 `JSXNodeFactory.createNode` 与 `@viewfly/core` 命名空间上的 `createRenderer`。
 * 须在首屏 `createRenderer` 之前调用；通常由 `@viewfly/devtools/vite-plugin-viewfly-hmr` 注入 install 子路径。
 */
export function installViewflyHmr(): void {
  if (installDone) {
    return
  }
  installDone = true
  ;(globalThis as { __VF_HMR__?: { captureRerender?: (fn: (c: Component) => void) => void } }).__VF_HMR__ = {
    captureRerender(fn: (c: Component) => void): void {
      rerunImpl = fn
    },
  }
  patchJsxCreateNode()
  patchCreateRendererExport()
}
