import { SCRIPT_FILE_RE } from '../scoped-css-core/constants'
import { createScopeId } from '../scoped-css-core/create-scope-id'
import { rewriteScopedStyleImports } from '../scoped-css-core/rewrite-imports'
import { isScopedStyleFile, transformScopedStyle } from '../scoped-css-core/transform-scoped-style'

type ViteTransformResult = string | {code: string; map: unknown} | void

function shouldSkip(id: string): boolean {
  return /node_modules/.test(id)
}

function createSplitPlugins() {
  const importPlugin = {
    name: 'vite-plugin-scoped-css-import',
    enforce: 'pre' as const,
    transform(rawCode: string, id: string): ViteTransformResult {
      if (shouldSkip(id) || !SCRIPT_FILE_RE.test(id)) {
        return
      }
      return rewriteScopedStyleImports(rawCode, id)
    }
  }
  const stylePlugin = {
    name: 'vite-plugin-scoped-css-add-id',
    transform(rawCode: string, id: string): ViteTransformResult {
      if (shouldSkip(id) || !isScopedStyleFile(id)) {
        return
      }
      const scopeId = createScopeId(id)
      const { code } = transformScopedStyle(rawCode, id, scopeId)
      return code
    }
  }
  return [importPlugin, stylePlugin]
}

//
// function createUnifiedPlugin() {
//   return {
//     name: 'vite-plugin-scoped-css',
//     enforce: 'pre' as const,
//     transform(rawCode: string, id: string): ViteTransformResult {
//       if (shouldSkip(id)) {
//         return
//       }
//       if (SCRIPT_FILE_RE.test(id)) {
//         return rewriteScopedStyleImports(rawCode, id)
//       }
//       if (isScopedStyleFile(id)) {
//         const scopeId = createScopeId(id)
//         const { code, map } = transformScopedStyle(rawCode, id, scopeId)
//         return { code, map }
//       }
//     }
//   }
// }

export default function scopedCssVitePlugin(inVue = false) {
  // inVue 为了兼容原来的参数，只为类型校验
  return createSplitPlugins()
}
