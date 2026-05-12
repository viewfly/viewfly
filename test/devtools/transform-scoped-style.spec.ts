import { scopeAttrName } from '../../packages/devtools/src/scoped-css-core/create-scope-id'
import { transformScopedStyle } from '../../packages/devtools/src/scoped-css-core/transform-scoped-style'

describe('transformScopedStyle (@vue/compiler-sfc)', () => {
  const scopeId = 'deadbeef'
  const attr = scopeAttrName(scopeId)

  test(':deep() 会穿透子选择器', () => {
    const { code } = transformScopedStyle('.root:deep(.inner) { color: red }', 'x.scoped.css', scopeId)
    expect(code).toContain(`.root[${attr}] .inner`)
    expect(code).not.toContain(':deep(')
  })

  test('普通选择器带 data-v 作用域', () => {
    const { code } = transformScopedStyle('.foo { color: blue }', 'x.scoped.css', scopeId)
    expect(code).toContain(`.foo[${attr}]`)
  })
})
