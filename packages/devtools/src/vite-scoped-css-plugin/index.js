import path from 'path'
import crypto from 'crypto'
import {compileStyle} from '@vue/component-compiler-utils'
import * as upath from 'upath'

const idMap = new Map()

function getScopedId(path) {
  path = upath.normalize(path)
  if (idMap.has(path)) {
    return idMap.get(path)
  }
  const scopedId = 'vf-' + crypto.createHash('sha256').update(path).digest('hex').slice(0, 6)
  idMap.set(path, scopedId)
  return scopedId
}

function replaceImport() {
  return {
    name: 'vite-plugin-scoped-css-import',
    enforce: 'pre',
    transform(rawCode, id) {
      if (/node_modules/.test(id)) {
        return
      }

      if (/(jsx?|tsx?)$/.test(id)) {
        return rawCode.replace(
          /import\s+(\w+)\s+from\s+['"]([.\-\/\w]+\.scoped\.(s?css|stylus|styl|less))['"]/g,
          (_, $1, $2) => {
            const p = path.join(id, '../', $2)
            const scopedId = getScopedId(p)
            return `import "${$2}";\nconst ${$1}= "${scopedId}";`
          })
      }
    }
  }
}

function addScopedIdToCss() {
  return {
    name: 'vite-plugin-scoped-css-add-id',
    enforce: 'post',
    transform(rawCode, id) {
      if (/node_modules/.test(id)) {
        return
      }

      if (/\.scoped\.(s?css|stylus|styl|less)$/.test(id)) {
        return rawCode.replace(/(const\s__vite__css\s=\s")(.+)(")(?=\s__vite__updateStyle\()/, function (str, $1, $2, $3) {
          const scopedId = getScopedId(id)
          const r = ($2 || '').replace(/\\n/g, '\n')
          const {code, map, errors} = compileStyle({
            source: r,
            filename: id,
            id: scopedId,
            scoped: true,
            trim: true,
          })
          if (errors.length) {
            console.error(errors[0])
          }
          return `${$1}${code.replace(/\n/g, '\\n')}${$3}`
        })
      }
    }
  }
}

function scopedCss() {
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


export default function (inVue = false) {
  if (inVue) {
    return [
      replaceImport(),
      addScopedIdToCss(),
    ]
  }
  return scopedCss()
}

