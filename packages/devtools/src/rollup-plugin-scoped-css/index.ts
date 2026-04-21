import path from 'path'
import Concat from 'concat-with-sourcemaps'
import { createFilter } from 'rollup-pluginutils'
import { SCRIPT_FILE_RE } from '../scoped-css-core/constants'
import { createScopeId } from '../scoped-css-core/create-scope-id'
import { rewriteScopedStyleImports } from '../scoped-css-core/rewrite-imports'
import { isScopedStyleFile, transformScopedStyle } from '../scoped-css-core/transform-scoped-style'
import sassLoader from '../style-preprocessor-loaders/sass-loader'
import lessLoader from '../style-preprocessor-loaders/less-loader'
import stylusLoader from '../style-preprocessor-loaders/stylus-loader'

const styleInjectPath = require.resolve('style-inject/dist/style-inject.es').replace(/[\\/]+/g, '/')

type SourceMapOption = boolean | 'inline'
type PreprocessorName = 'sass' | 'less' | 'stylus'
type PreprocessorOptions = Partial<Record<PreprocessorName, Record<string, unknown>>>
type InjectOption = boolean | Record<string, unknown>

type ScopedCssRollupPluginOptions = {
  include?: string | RegExp | Array<string | RegExp> | null
  exclude?: string | RegExp | Array<string | RegExp> | null
  root?: string
  sourceMap?: SourceMapOption
  extract?: boolean | string
  inject?: InjectOption
  use?: PreprocessorOptions
}

type CompiledStyle = {
  code: string
  map?: any
  dependencies: Set<string>
}

function normalizePath(filePath: string): string {
  return filePath.replace(/[\\/]+/g, '/')
}

function stripQuery(id: string): string {
  return id.replace(/[?#].*$/, '')
}

function isScriptFile(id: string): boolean {
  return SCRIPT_FILE_RE.test(stripQuery(id))
}

function getPreprocessor(filePath: string): PreprocessorName | null {
  if (/\.(sass|scss)$/i.test(filePath)) return 'sass'
  if (/\.less$/i.test(filePath)) return 'less'
  if (/\.(styl|stylus)$/i.test(filePath)) return 'stylus'
  return null
}

function getPreprocessorLoader(name: PreprocessorName) {
  if (name === 'sass') return sassLoader
  if (name === 'less') return lessLoader
  return stylusLoader
}

async function preprocessStyle(code: string, id: string, sourceMap: SourceMapOption, use?: PreprocessorOptions): Promise<CompiledStyle> {
  const cleanId = stripQuery(id)
  const dependencies = new Set<string>()
  const preprocessor = getPreprocessor(cleanId)
  if (!preprocessor) {
    return { code, dependencies }
  }
  const loader = getPreprocessorLoader(preprocessor)
  const result = (await loader.process.call({
    id: cleanId,
    sourceMap,
    options: use?.[preprocessor] || {},
    dependencies,
    warn: () => undefined
  }, { code })) as { code: string; map?: any }

  return {
    code: result.code,
    map: result.map,
    dependencies
  }
}

function createInjectCode(cssVariableName: string, injectOption: InjectOption): string {
  if (!injectOption) {
    return ''
  }
  const options = typeof injectOption === 'object' ? `, ${JSON.stringify(injectOption)}` : ''
  return `\nimport styleInject from '${styleInjectPath}';\nstyleInject(${cssVariableName}${options});`
}

function createExtractFileName(outputOptions: any, bundle: Record<string, any>, extract: boolean | string): string {
  if (typeof extract === 'string') {
    if (path.isAbsolute(extract)) {
      const dir = outputOptions.dir || path.dirname(outputOptions.file)
      return normalizePath(path.relative(dir, extract))
    }
    return normalizePath(extract)
  }
  const file = outputOptions.file || Object.keys(bundle).find(fileName => bundle[fileName].isEntry) || 'index.js'
  return `${path.basename(file, path.extname(file))}.css`
}

export default function scopedCssRollupPlugin(options: ScopedCssRollupPluginOptions = {}) {
  const {
    include,
    exclude,
    root = process.cwd(),
    sourceMap = false,
    extract = true,
    inject = false,
    use
  } = options
  const filter = createFilter(include || ['**/*.{js,jsx,ts,tsx,css,scss,sass,less,styl,stylus}'], exclude)
  const extracted = new Map<string, { code: string; map?: any }>()

  return {
    name: 'rollup-plugin-scoped-css',
    async transform(this: any, rawCode: string, id: string) {
      const cleanId = stripQuery(id)
      if (!filter(cleanId) || /node_modules/.test(cleanId)) {
        return null
      }

      if (isScriptFile(cleanId)) {
        const rewritten = rewriteScopedStyleImports(rawCode, cleanId)
        if (rewritten === rawCode) return null
        return { code: rewritten, map: null }
      }

      if (!isScopedStyleFile(cleanId)) {
        return null
      }

      const preprocessed = await preprocessStyle(rawCode, cleanId, sourceMap, use)
      for (const dep of preprocessed.dependencies) {
        this.addWatchFile(dep)
      }

      const scopedId = createScopeId(cleanId, root)
      const transformed = transformScopedStyle(preprocessed.code, cleanId, scopedId)
      const cssMap = transformed.map || preprocessed.map
      const cssVar = '__SCOPED_CSS__'
      let output = ''

      if (extract) {
        extracted.set(cleanId, { code: transformed.code, map: cssMap })
      } else {
        output += `var ${cssVar} = ${JSON.stringify(transformed.code)};\n`
        output += `export var stylesheet = ${cssVar};`
        output += createInjectCode(cssVar, inject)
      }

      if (extract) {
        output = `export default ${JSON.stringify(scopedId)};\n`
      } else {
        output = `export default ${JSON.stringify(scopedId)};\n${output}`
      }

      return {
        code: output,
        map: { mappings: '' }
      }
    },
    generateBundle(this: any, outputOptions: any, bundle: Record<string, any>) {
      if (!extract || extracted.size === 0) {
        return
      }

      const fileName = createExtractFileName(outputOptions, bundle, extract)
      const concat = new Concat(true, fileName, '\n')
      for (const [id, result] of extracted) {
        concat.add(normalizePath(id), result.code, result.map || null)
      }

      let outputCode = concat.content.toString()
      if (sourceMap === 'inline') {
        const b64 = Buffer.from(concat.sourceMap || '', 'utf8').toString('base64')
        outputCode += `\n/*# sourceMappingURL=data:application/json;base64,${b64}*/`
      } else if (sourceMap === true) {
        outputCode += `\n/*# sourceMappingURL=${path.basename(fileName)}.map */`
      }

      this.emitFile({
        type: 'asset',
        fileName,
        source: outputCode
      })

      if (sourceMap === true && concat.sourceMap) {
        this.emitFile({
          type: 'asset',
          fileName: `${fileName}.map`,
          source: concat.sourceMap
        })
      }
    }
  }
}
