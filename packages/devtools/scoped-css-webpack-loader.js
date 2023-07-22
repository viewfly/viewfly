const compileStyle = require('@vue/component-compiler-utils').compileStyle
const cssLoader = require('css-loader')

module.exports = function scopedCssWebpackLoader(source, map, meta) {
  if (/scoped\.(s?[ca]ss|less|styl(us)?)$/.test(this.resource)) {
    const id = 'data-vf-' + Math.random().toString(16).replace('.', '')
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
