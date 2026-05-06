import path from 'node:path'

import type { Plugin } from 'vite'
import { normalizePath } from 'vite'

import { applyEntryCreateAppWrap } from './ast-entry-create-app'
import { applyViewflyHmrRegistryTransform } from './ast-hmr-registry'

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

/** Vite 开发态：bootstrap、`createApp` 包装、`__vfRegistry`+wire、HMR accept（`apply: 'serve'`）。 */
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

      let out = code

      if (
        autoInjectBootstrap
        && isEntry(id, root)
        && !out.includes(markerBootstrap)
      ) {
        const entryWrapped = applyEntryCreateAppWrap(out, id, RUNTIME_PKG)
        if (entryWrapped) {
          out = entryWrapped
        }
      }

      if (astRegistry && /\.(tsx|jsx)$/.test(cleanId(id))) {
        const astOut = applyViewflyHmrRegistryTransform(out, id)
        if (astOut) {
          out = astOut.code
        }
      }

      if (
        autoInjectBootstrap
        && isEntry(id, root)
        && !out.includes(markerBootstrap)
      ) {
        out = `import 'virtual:viewfly-hmr-bootstrap'\n/* ${markerBootstrap} */\n${out}`
      }

      const needsAccept = !out.includes(markerAccept)
      const needsWireImport = out.includes('wireViewflyHmrModule(')

      const importNames: string[] = []
      if (needsWireImport) {
        importNames.push('wireViewflyHmrModule')
      }
      if (needsAccept) {
        importNames.push('viewflyHmrAcceptSelf')
      }
      if (importNames.length > 0 && !out.includes(markerRuntimeImport)) {
        const importLine = `import { ${importNames.join(', ')} } from '${RUNTIME_PKG}'\n/* ${markerRuntimeImport} */\n`
        if (out.includes(`/* ${markerBootstrap} */`)) {
          out = out.replace(
            `/* ${markerBootstrap} */\n`,
            `/* ${markerBootstrap} */\n${importLine}`,
          )
        } else {
          out = `${importLine}${out}`
        }
      }

      if (needsAccept) {
        const injection = `
/* ${markerAccept} */
if (import.meta.hot) {
  import.meta.hot.accept((mod) => {
    viewflyHmrAcceptSelf(import.meta.url, mod)
  })
}
`
        out = `${out}\n${injection}`
      }

      if (out === code) {
        return
      }
      return {
        code: out,
        map: null
      }
    }
  }
}
