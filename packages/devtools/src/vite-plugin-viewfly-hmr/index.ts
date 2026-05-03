import { transformSync } from '@babel/core'
import type { Plugin as VitePlugin, UserConfig } from 'vite'

import jsxPluginRaw from '@babel/plugin-transform-react-jsx'
import tsPluginRaw from '@babel/plugin-transform-typescript'

/** Babel CommonJS default interop（ESM 直引时常为 { default }） */
function defaultExport<T extends object>(m: T): T {
  const d = m as T & { default?: T }
  return d.default ?? m
}

const babelPluginTransformReactJsx = defaultExport(jsxPluginRaw)
const babelPluginTransformTypeScript = defaultExport(tsPluginRaw)
import viewflyHmrBabelPlugin from './babel-plugin-viewfly-hmr'

const FILE_RE = /\.(tsx|jsx)$/

const DEFAULT_HMR_ENTRY_RE = /[/\\]main\.(tsx|jsx)$/

const HMR_INSTALL_PKG = '@viewfly/devtools/hmr-runtime/install'

function normalizePathId(id: string): string {
  return id.replace(/\\/g, '/')
}

function shouldInjectHmrInstall(
  id: string,
  entry: ViewflyHmrOptions['hmrInstallEntry'],
): boolean {
  if (entry === false) {
    return false
  }
  const norm = normalizePathId(id)
  if (typeof entry === 'string') {
    const e = entry.replace(/\\/g, '/')
    return norm.endsWith(e) || norm.endsWith(`/${e}`)
  }
  if (entry instanceof RegExp) {
    return entry.test(id)
  }
  return DEFAULT_HMR_ENTRY_RE.test(norm)
}

function hasHmrRuntimeInstallImport(source: string): boolean {
  return source.includes(HMR_INSTALL_PKG)
    || source.includes('@viewfly/hmr-runtime/install')
}

export interface ViewflyHmrOptions {
  /** 不参与 HMR 包装的路径正则或子字符串 */
  exclude?: readonly (string | RegExp)[]
  /**
   * 开发服务（`vite`）下在匹配到的入口文件**最顶部**插入 hmr install import。
   * 默认匹配路径以 `/main.tsx` 或 `/main.jsx` 结尾；设为 `false` 关闭；或传入自定义 `RegExp` / 子路径字符串。
   */
  hmrInstallEntry?: RegExp | string | false
}

function isExcluded(id: string, exclude?: readonly (string | RegExp)[]): boolean {
  if (!exclude?.length) {
    return false
  }
  for (const p of exclude) {
    if (typeof p === 'string' ? id.includes(p) : p.test(id)) {
      return true
    }
  }
  return false
}

/**
 * Viewfly Vite HMR：为导出的 PascalCase 函数组件/default export 组件生成稳定引用 + 运行时热替换 setup。
 *
 * 在 **`vite dev`（`command === 'serve'`）** 下，会在默认入口 `main.tsx` / `main.jsx` 顶部自动插入
 * `@viewfly/devtools/hmr-runtime/install`；`vite build` 不会插入。
 * 需安装 peer：`@viewfly/core`、`@viewfly/devtools`。
 *
 * ```ts
 * import { defineConfig } from 'vite'
 * import { viewflyHmr } from '@viewfly/devtools/vite-plugin-viewfly-hmr'
 *
 * export default defineConfig({
 *   plugins: [viewflyHmr()],
 * })
 * ```
 */
export function viewflyHmr(options: ViewflyHmrOptions = {}): VitePlugin {
  let isDev = true
  let isServe = false

  return {
    name: 'viewfly-hmr',
    enforce: 'pre',
    config(): UserConfig {
      return {
        esbuild: {
          jsx: 'preserve',
        },
      } as UserConfig
    },
    configResolved(cfg) {
      isDev = cfg.mode === 'development'
      isServe = cfg.command === 'serve'
    },
    transform(code, id) {
      if (!FILE_RE.test(id) || id.includes('node_modules') || isExcluded(id, options.exclude)) {
        return null
      }

      let source = code
      if (
        isServe
        && shouldInjectHmrInstall(id, options.hmrInstallEntry)
        && !hasHmrRuntimeInstallImport(source)
      ) {
        source = `import '${HMR_INSTALL_PKG}'\n${source}`
      }

      const result = transformSync(source, {
        babelrc: false,
        configFile: false,
        filename: id,
        parserOpts: {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
        },
        plugins: [
          viewflyHmrBabelPlugin,
          [
            babelPluginTransformTypeScript,
            { isTSX: true, allowNamespaces: true, onlyRemoveTypeImports: false },
          ],
          [
            babelPluginTransformReactJsx,
            {
              runtime: 'automatic',
              importSource: '@viewfly/core',
              development: isDev,
            },
          ],
        ],
        sourceMaps: true,
      })

      if (!result?.code) {
        return null
      }
      return {
        code: result.code,
        map: result.map ?? undefined,
      }
    },
  }
}
