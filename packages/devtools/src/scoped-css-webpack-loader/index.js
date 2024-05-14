import {compileStyle} from '@vue/component-compiler-utils'
import cssLoader from 'css-loader'
import crypto from 'crypto'

export default function scopedCssWebpackLoader(source, map, meta) {
  if (/scoped\.(s?[ca]ss|less|styl(us)?)$/.test(this.resource)) {
    const hash = crypto.createHash('sha256').update(source).digest('hex').slice(0, 6)
    const id = 'vf-' + hash
    const {code, map, errors} = compileStyle({
      source,
      // @ts-ignore
      filename: this.resource,
      id: id,
      scoped: true,
      trim: true,
    })
    if (errors.length) {
      console.error(errors[0])
    }
    const oldAsync = this.async
    this.async = function (...args) {
      const callback = oldAsync.apply(this, args)
      return function (_, code, a, b, c, d, e) {
        const newCode = code.replace(/export default/, `\n ___CSS_LOADER_EXPORT___.locals = "${id}"\n export default`)
        callback(_, newCode, a, b, c, d, e)
      }
    }
    cssLoader.apply(this, [code, map])
    this.async = oldAsync
    return
  }
  cssLoader.apply(this, [source, map, meta])
}
