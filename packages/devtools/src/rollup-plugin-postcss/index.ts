import path from 'path'
import cssnano from 'cssnano'
import Concat from 'concat-with-sourcemaps'
import { createFilter } from 'rollup-pluginutils'
import Loaders from './loaders'
import normalizePath from './utils/normalize-path'

function inferOption(option: any, defaultValue: any) {
  if (option === false) return false
  if (option && typeof option === 'object') return option
  return option ? {} : defaultValue
}

function getRecursiveImportOrder(id: string, getModuleInfo: (value: string) => any, seen = new Set<string>()): string[] {
  if (seen.has(id)) return []
  seen.add(id)
  const result = [id]
  getModuleInfo(id).importedIds.forEach((importFile: string) => {
    result.push(...getRecursiveImportOrder(importFile, getModuleInfo, seen))
  })
  return result
}

export default (options: any = {}) => {
  const filter = createFilter(options.include, options.exclude)
  const postcssPlugins = Array.isArray(options.plugins) ? options.plugins.filter(Boolean) : options.plugins
  const { sourceMap } = options
  const postcssLoaderOptions = {
    inject: typeof options.inject === 'function' ? options.inject : inferOption(options.inject, {}),
    extract: typeof options.extract === 'undefined' ? false : options.extract,
    onlyModules: options.modules === true,
    modules: inferOption(options.modules, false),
    namedExports: options.namedExports,
    autoModules: options.autoModules,
    minimize: inferOption(options.minimize, false),
    config: inferOption(options.config, {}),
    to: options.to,
    postcss: {
      parser: options.parser,
      plugins: postcssPlugins,
      syntax: options.syntax,
      stringifier: options.stringifier,
      exec: options.exec
    }
  }

  let use: any[] = ['sass', 'stylus', 'less']
  if (Array.isArray(options.use)) {
    use = options.use
  } else if (options.use !== null && typeof options.use === 'object') {
    use = [
      ['sass', options.use.sass || {}],
      ['stylus', options.use.stylus || {}],
      ['less', options.use.less || {}]
    ]
  }
  use.unshift(['postcss', postcssLoaderOptions])
  const loaders = new Loaders({ use, loaders: options.loaders, extensions: options.extensions })
  const extracted = new Map<string, any>()

  return {
    name: 'postcss',
    async transform(this: any, code: string, id: string) {
      if (!filter(id) || !loaders.isSupported(id)) return null
      if (typeof options.onImport === 'function') options.onImport(id)

      const loaderContext = { id, sourceMap, dependencies: new Set<string>(), warn: this.warn.bind(this), plugin: this }
      const result = await loaders.process({ code, map: undefined }, loaderContext)
      for (const dep of loaderContext.dependencies) {
        this.addWatchFile(dep)
      }
      if (postcssLoaderOptions.extract) {
        extracted.set(id, result.extracted)
        return { code: result.code, map: { mappings: '' } }
      }
      return { code: result.code, map: result.map || { mappings: '' } }
    },
    augmentChunkHash() {
      if (extracted.size === 0) return
      const extractedValue = [...extracted].reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
      return JSON.stringify(extractedValue)
    },
    async generateBundle(this: any, outputOptions: any, bundle: any) {
      if (extracted.size === 0 || !(outputOptions.dir || outputOptions.file)) return

      const dir = outputOptions.dir || path.dirname(outputOptions.file)
      const file = outputOptions.file || path.join(outputOptions.dir, Object.keys(bundle).find(fileName => bundle[fileName].isEntry) || '')
      const getExtracted = () => {
        let fileName = `${path.basename(file, path.extname(file))}.css`
        if (typeof postcssLoaderOptions.extract === 'string') {
          fileName = path.isAbsolute(postcssLoaderOptions.extract)
            ? normalizePath(path.relative(dir, postcssLoaderOptions.extract))
            : normalizePath(postcssLoaderOptions.extract)
        }
        const concat = new Concat(true, fileName, '\n')
        const entries = [...extracted.values()]
        const chunk = bundle[normalizePath(path.relative(dir, file))]
        if (chunk?.modules) {
          const moduleIds = getRecursiveImportOrder(chunk.facadeModuleId, this.getModuleInfo)
          entries.sort((a, b) => moduleIds.indexOf(a.id) - moduleIds.indexOf(b.id))
        }
        for (const result of entries) {
          const relative = normalizePath(path.relative(dir, result.id))
          const map = result.map || null
          if (map) map.file = fileName
          concat.add(relative, result.code, map)
        }
        let outputCode = concat.content.toString()
        if (sourceMap === 'inline') {
          const b64 = Buffer.from(concat.sourceMap || '', 'utf8').toString('base64')
          outputCode += `\n/*# sourceMappingURL=data:application/json;base64,${b64}*/`
        } else if (sourceMap === true) {
          outputCode += `\n/*# sourceMappingURL=${path.basename(fileName)}.map */`
        }
        return {
          code: outputCode,
          map: sourceMap === true && concat.sourceMap,
          codeFileName: fileName,
          mapFileName: `${fileName}.map`
        }
      }

      if (options.onExtract) {
        const shouldExtract = await options.onExtract(getExtracted)
        if (shouldExtract === false) return
      }

      const cssBundle = getExtracted()
      let { code, map } = cssBundle
      const { codeFileName, mapFileName } = cssBundle
      if (postcssLoaderOptions.minimize) {
        const cssOptions: any = { from: codeFileName }
        if (sourceMap === 'inline') cssOptions.map = { inline: true }
        else if (sourceMap === true && map) {
          cssOptions.map = { prev: map }
          cssOptions.to = codeFileName
        }
        const result = await cssnano(postcssLoaderOptions.minimize).process(code, cssOptions)
        code = result.css
        if (sourceMap === true && result.map?.toString) {
          map = result.map.toString()
        }
      }

      this.emitFile({ fileName: codeFileName, type: 'asset', source: code })
      if (map) this.emitFile({ fileName: mapFileName, type: 'asset', source: map })
    }
  }
}
