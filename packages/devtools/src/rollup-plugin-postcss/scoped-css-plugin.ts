const selectorParser = require('postcss-selector-parser')

export default function scopedCssPlugin(scopeId: string) {
  return {
    postcssPlugin: 'add-scoped-id',
    prepare(result: any) {
      const keyframes: Record<string, string> = Object.create(null)
      const root = result.root
      root.each(function rewriteSelector(rule: any) {
        if (!rule.selector) {
          if (rule.type === 'atrule') {
            if (rule.name === 'media' || rule.name === 'supports') {
              rule.each(rewriteSelector)
            } else if (/-?keyframes$/.test(rule.name)) {
              keyframes[rule.params] = rule.params = `${rule.params}-${scopeId}`
            }
          }
          return
        }

        rule.selector = selectorParser((selectors: any) => {
          selectors.each((selector: any) => {
            let targetNode: any = null
            selector.each((node: any) => {
              if (node.type === 'combinator' && (node.value === '>>>' || node.value === '/deep/')) {
                node.value = ' '
                node.spaces.before = node.spaces.after = ''
                return false
              }
              if (node.type === 'pseudo' && node.value === '::v-deep') {
                node.value = node.spaces.before = node.spaces.after = ''
                return false
              }
              if (node.type !== 'pseudo' && node.type !== 'combinator') {
                targetNode = node
              }
            })

            if (targetNode) {
              targetNode.spaces.after = ''
            } else if (selector.first) {
              selector.first.spaces.before = ''
            }

            selector.insertAfter(targetNode, selectorParser.attribute({ attribute: scopeId, value: '', raws: {} }))
          })
        }).processSync(rule.selector)
      })

      if (Object.keys(keyframes).length > 0) {
        root.walkDecls((decl: any) => {
          if (/^(-\w+-)?animation-name$/.test(decl.prop)) {
            decl.value = decl.value
              .split(',')
              .map((v: string) => keyframes[v.trim()] || v.trim())
              .join(',')
          }
          if (/^(-\w+-)?animation$/.test(decl.prop)) {
            decl.value = decl.value
              .split(',')
              .map((v: string) => {
                const vals = v.trim().split(/\s+/)
                const idx = vals.findIndex(val => keyframes[val])
                if (idx !== -1) {
                  vals.splice(idx, 1, keyframes[vals[idx]])
                  return vals.join(' ')
                }
                return v
              })
              .join(',')
          }
        })
      }
      return result.processor
    }
  }
}
