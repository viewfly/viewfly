import cssLoader from 'css-loader'
import { createScopeId } from '../scoped-css-core/create-scope-id'
import { isScopedStyleFile, transformScopedStyle } from '../scoped-css-core/transform-scoped-style'

type LoaderCallback = (...args: unknown[]) => void
type LoaderAsync = (...args: unknown[]) => LoaderCallback

type LoaderContext = {
  resource: string
  rootContext?: string
  async: LoaderAsync
}

export default function scopedCssWebpackLoader(this: LoaderContext, source: string, map: unknown, meta: unknown): void {
  if (!isScopedStyleFile(this.resource)) {
    cssLoader.apply(this, [source, map, meta])
    return
  }
  const scopeId = createScopeId(this.resource, this.rootContext || process.cwd())
  const { code, map: cssMap } = transformScopedStyle(source, this.resource, scopeId)
  const oldAsync = this.async
  this.async = function (this: LoaderContext, ...args: unknown[]) {
    const callback = oldAsync.apply(this, args)
    return function (_err: unknown, transformedCode: string, ...rest: unknown[]) {
      const patchedCode = transformedCode.replace(
        /export default/,
        `\n ___CSS_LOADER_EXPORT___.locals = "${scopeId}"\n export default`
      )
      callback(_err, patchedCode, ...rest)
    }
  } as typeof oldAsync
  cssLoader.apply(this, [code, cssMap])
  this.async = oldAsync
}
