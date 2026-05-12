import path from 'node:path'

import MagicString from 'magic-string'
import type { Plugin } from 'vite'
import { normalizePath } from 'vite'

import { applyEntryCreateAppWrap } from './ast-entry-create-app'
import { applyViewflyHmrRegistryTransform } from './ast-hmr-registry'
import {
  appendUpstreamSourceMap,
  composeVitePluginSourceMaps,
  normalizeSourceMapInput,
  type RawSourceMapJson,
} from './compose-hmr-source-maps'

const VIRTUAL_BOOTSTRAP = '\0virtual:viewfly-hmr-bootstrap'

const RUNTIME_PKG = '@viewfly/devtools/vite-viewfly-hmr-plugin/runtime'

function cleanId(id: string): string {
  return id.split('?')[0]
}

function createSrcOnlyInclude(root: string): (id: string) => boolean {
  const nRoot = normalizePath(path.resolve(root))
  return (id: string) => {
    const abs = normalizePath(path.resolve(cleanId(id)))
    const rel = path.relative(nRoot, abs).replace(/\\/g, '/')
    return (
      !rel.startsWith('..')
      && rel.length > 0
      && rel.startsWith('src/')
      && /\.(m?[jt]sx?)$/.test(rel)
    )
  }
}

function defaultIsEntryFile(id: string, root: string): boolean {
  const nRoot = normalizePath(path.resolve(root))
  const abs = normalizePath(path.resolve(cleanId(id)))
  const rel = path.relative(nRoot, abs).replace(/\\/g, '/')
  return /^src\/main\.(m?[jt]sx?)$/.test(rel)
}

export interface ViewflyHmrPluginOptions {
  include?: (id: string) => boolean
  autoInjectBootstrap?: boolean
  isEntry?: (id: string, root: string) => boolean
  /**
   * 是否对含 JSX 的模块做 AST 改写（自动 `__vfRegistry` + wire + 改写 JSX / `component:`）。
   * 默认 true；关闭后仅保留 bootstrap 与 `hot.accept`。
   */
  astRegistry?: boolean
}

const bootstrapLoad = (): string => `
import { installViewflyHmrCreateNodePatch } from '${RUNTIME_PKG}'

const __VF_G__ = globalThis
if (!__VF_G__.__VIEWFLY_HMR_BOOTSTRAP_DONE__) {
  __VF_G__.__VIEWFLY_HMR_BOOTSTRAP_DONE__ = true
  installViewflyHmrCreateNodePatch()
}
`.trim()

/** Vite 开发态：bootstrap、`createApp` 包装、`__vfRegistry`+wire、HMR accept（仅 `vite dev`，`vite build` 不注入）。 */
export function viewflyHmrPlugin(options: ViewflyHmrPluginOptions = {}): Plugin {
  let root: string
  let include: (id: string) => boolean = () => false
  let isEntry: (id: string, r: string) => boolean = defaultIsEntryFile
  const autoInjectBootstrap = options.autoInjectBootstrap !== false
  const astRegistry = options.astRegistry !== false

  const markerAccept = 'viewfly-hmr-injected'
  const markerBootstrap = 'viewfly-hmr-bootstrap-import'
  const markerRuntimeImport = 'viewfly-hmr-runtime-import'

  return {
    name: 'viewfly-hmr',
    /** 仅开发：`vite build` 不注入 HMR / registry 改写 */
    apply: 'serve',
    enforce: 'pre',
    configResolved(config) {
      root = config.root
      include = options.include ?? createSrcOnlyInclude(config.root)
      if (options.isEntry) {
        isEntry = options.isEntry
      }
    },
    resolveId(id) {
      if (id === 'virtual:viewfly-hmr-bootstrap') {
        return VIRTUAL_BOOTSTRAP
      }
      return undefined
    },
    load(id) {
      if (id === VIRTUAL_BOOTSTRAP) {
        return bootstrapLoad()
      }
      return undefined
    },
    transform(code, id, opts) {
      if (opts?.ssr) {
        return
      }
      if (!include(id)) {
        return
      }

      const inputCode = code
      let out = code
      let entryMap: RawSourceMapJson | null = null
      let astMap: RawSourceMapJson | null = null

      if (
        autoInjectBootstrap
        && isEntry(id, root)
        && !out.includes(markerBootstrap)
      ) {
        const wrapped = applyEntryCreateAppWrap(out, id, RUNTIME_PKG)
        if (wrapped) {
          out = wrapped.code
          entryMap = normalizeSourceMapInput(wrapped.map)
        }
      }

      if (astRegistry && /\.(tsx|jsx)$/.test(cleanId(id))) {
        const astOut = applyViewflyHmrRegistryTransform(out, id)
        if (astOut) {
          out = astOut.code
          astMap = normalizeSourceMapInput(astOut.map)
        }
      }

      const afterBabel = out
      const needsAccept = !afterBabel.includes(markerAccept)
      /** Babel 可能格式化 callee 与 `(` 之间有空格，故不用 `wireViewflyHmrModule(` 做唯一判断 */
      const needsWireImport = Boolean(astMap) || afterBabel.includes('wireViewflyHmrModule')

      const sourceIdForMap = normalizePath(cleanId(id))
      const s = new MagicString(afterBabel)

      const importNames: string[] = []
      if (needsWireImport) {
        importNames.push('wireViewflyHmrModule')
      }
      if (needsAccept) {
        importNames.push('viewflyHmrAcceptSelf')
      }

      // 头部（bootstrap + runtime import）必须一次性 prepend。
      // 若先 prepend bootstrap 再对「bootstrap 标记注释」做 replace，magic-string 只在原始
      // afterBabel 上查找子串，prepend 的内容不在 original 里，会导致 runtime import 整段丢失。
      const headParts: string[] = []
      if (
        autoInjectBootstrap
        && isEntry(id, root)
        && !afterBabel.includes(markerBootstrap)
      ) {
        headParts.push(
          'import \'virtual:viewfly-hmr-bootstrap\'',
          `/* ${markerBootstrap} */`,
          '',
        )
      }
      if (importNames.length > 0 && !afterBabel.includes(markerRuntimeImport)) {
        headParts.push(
          `import { ${importNames.join(', ')} } from '${RUNTIME_PKG}'`,
          `/* ${markerRuntimeImport} */`,
          '',
        )
      }
      if (headParts.length > 0) {
        s.prepend(headParts.join('\n'))
      }

      if (needsAccept) {
        s.append(`
/* ${markerAccept} */
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    viewflyHmrAcceptSelf(import.meta.url, mod)
  })
}
`)
      }

      out = s.toString()

      if (out === inputCode) {
        return
      }

      const magicMap = normalizeSourceMapInput(
        s.generateMap({
          hires: true,
          source: sourceIdForMap,
          includeContent: true,
        }),
      )

      const chain: RawSourceMapJson[] = []
      if (magicMap) {
        chain.push(magicMap)
      }
      if (astMap) {
        chain.push(astMap)
      }
      if (entryMap) {
        chain.push(entryMap)
      }

      let combined = composeVitePluginSourceMaps(chain)

      try {
        const upstream = (this as { getCombinedSourcemap?: () => unknown }).getCombinedSourcemap?.()
        combined = appendUpstreamSourceMap(combined, upstream)
      } catch {
        /* 无上游 map 或 API 不可用时忽略 */
      }

      return {
        code: out,
        map: combined,
      }
    }
  }
}
