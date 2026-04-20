import { compileStyle } from '@vue/component-compiler-utils'
import { SCOPED_STYLE_FILE_RE } from './constants'

export function isScopedStyleFile(filePath: string): boolean {
  return SCOPED_STYLE_FILE_RE.test(filePath)
}

export function transformScopedStyle(source: string, filename: string, scopeId: string): { code: string; map: unknown } {
  const result = compileStyle({
    source,
    filename,
    id: scopeId,
    scoped: true,
    trim: true
  })
  if (result.errors.length > 0) {
    console.error(result.errors[0])
  }
  return {
    code: result.code,
    map: result.map
  }
}
