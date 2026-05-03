import type { Component, ComponentAdapter } from '@viewfly/core'
import { setComponentAdapter } from '@viewfly/core'

type HotHolder = {
  impl: (props: any) => any
  instances: Set<Component>
}

type HotEntry = {
  holder: HotHolder
  wrapper: (props: any) => any
  /** 由编译插件注入的实现摘要；同文件内仅摘要变化的导出会触发刷新 */
  lastDigest?: string
}

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

function onComponentMounted(component: Component): void {
  const id = (component.type as { __vfHotId?: string } | null | undefined)?.__vfHotId
  if (!id) {
    return
  }
  const entry = getCache().get(id)
  if (entry) {
    entry.holder.instances.add(component)
  }
}

function onComponentDestroyed(component: Component): void {
  const id = (component.type as { __vfHotId?: string } | null | undefined)?.__vfHotId
  if (!id) {
    return
  }
  const entry = getCache().get(id)
  entry?.holder.instances.delete(component)
}

const hmrDevAdapter: ComponentAdapter = {
  onComponentMounted,
  onComponentDestroyed,
  registerRerenderHandler(fn: (c: Component) => void): void {
    rerunImpl = fn
  },
}

/**
 * 将 HMR 运行时挂到 `@viewfly/core` 的 adapter。
 * 须在首屏组件挂载前调用；通常由 `@viewfly/devtools/vite-plugin-viewfly-hmr` 注入 install 子路径。
 */
export function installViewflyHmr(): void {
  setComponentAdapter(hmrDevAdapter)
}

/**
 * 为函数组件创建（或复用）稳定代理，使 Vite HMR 重跑模块时仍能按同一组件类型做 diff。
 * 由 Vite 插件从本包注入；业务代码不要直接调用。
 */
export function __vfMakeHot(
  impl: (props: any) => any,
  exportName: string,
  moduleUrl: string,
  digest?: string,
): (props: any) => any {
  const id = `${normalizeHotModuleUrl(moduleUrl)}#${exportName}`
  const cache = getCache()
  let entry = cache.get(id)
  if (!entry) {
    const holder: HotHolder = { impl, instances: new Set() }
    function wrapper(props: any) {
      return holder.impl(props)
    }
    entry = { holder, wrapper, lastDigest: digest }
    ;(wrapper as { __vfHotId?: string }).__vfHotId = id
    cache.set(id, entry)
  } else {
    if (digest !== undefined && entry.lastDigest === digest) {
      entry.holder.impl = impl
      return entry.wrapper
    }
    entry.holder.impl = impl
    if (digest !== undefined) {
      entry.lastDigest = digest
    }
    queueEntryRefresh(entry)
  }
  return entry.wrapper
}
