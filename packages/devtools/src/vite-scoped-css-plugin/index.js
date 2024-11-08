import path from 'path'
import crypto from 'crypto'
import {compileStyle} from '@vue/component-compiler-utils'

const idMap = new Map()

function getScopedId(path) {
  if (idMap.has(path)) {
    return idMap.get(path)
  }
  const scopedId = 'vf-' + crypto.createHash('sha256').update(path).digest('hex').slice(0, 6)
  idMap.set(path, scopedId)
  return scopedId
}

export default function () {
  return {
    name: 'vite-plugin-scoped-css',
    enforce: 'pre',
    transform(rawCode, id) {
      if (/node_modules/.test(id)) {
        return
      }

      if (/(jsx?|tsx?)$/.test(id)) {
        return rawCode.replace(
          /import\s+(\w+)\s+from\s+['"]([.-\/\w]+\.scoped\.(s?css|stylus|styl|less))['"](?=[;\s])/g,
          (_, $1, $2) => {
            const p = path.join(id, '../', $2)
            const scopedId = getScopedId(p)
            return `import "${$2}";\nconst ${$1}= "${scopedId}";`
          })
      }

      if (/\.scoped\.(s?css|stylus|styl|less)$/.test(id)) {
        const scopedId = getScopedId(id)
        const {code, map, errors} = compileStyle({
          source: rawCode,
          filename: id,
          id: scopedId,
          scoped: true,
          trim: true,
        })
        if (errors.length) {
          console.error(errors[0])
        }
        return {code, map}
      }
    }
  }
}
