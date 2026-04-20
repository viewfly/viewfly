import importCwd from 'import-cwd'
import postcss from 'postcss'
import findPostcssConfig from 'postcss-load-config'
import { identifier } from 'safe-identifier'

import humanlizePath from './utils/humanlize-path'
import normalizePath from './utils/normalize-path'
import scopedCssPlugin from './scoped-css-plugin'
import { createScopeId } from '../scoped-css-core/create-scope-id'
import { isScopedStyleFile } from '../scoped-css-core/transform-scoped-style'

const styleInjectPath = require.resolve('style-inject/dist/style-inject.es').replace(/[\\/]+/g, '/')

function loadConfig(id: string, options: { ctx?: any; path?: string }) {
  const handleError = (err: Error) => {
    if (!err.message.includes('No PostCSS Config found')) {
      throw err
    }
    return {}
  }
  const configPath = options.path ? require('path').resolve(options.path) : require('path').dirname(id)
  const ctx = {
    file: {
      extname: require('path').extname(id),
      dirname: require('path').dirname(id),
      basename: require('path').basename(id)
    },
    options: options.ctx || {}
  }
  return (findPostcssConfig as any)(ctx, configPath).catch(handleError)
}

function ensurePostCSSOption(option: unknown) {
  return typeof option === 'string' ? importCwd(option) : option
}

function isModuleFile(file: string): boolean {
  return /\.module\.[a-z]{2,6}$/.test(file)
}

export default {
  name: 'postcss',
  alwaysProcess: true,
  async process(this: any, { code, map }: { code: string; map?: unknown }) {
    const config = this.options.config ? await loadConfig(this.id, this.options.config) : {}
    const options = this.options
    const plugins = [...(options.postcss.plugins || []), ...((config as any).plugins || [])]
    const shouldExtract = options.extract
    const shouldInject = options.inject

    const modulesExported: Record<string, any> = {}
    const autoModules = options.autoModules !== false && options.onlyModules !== true
    const isAutoModule = autoModules && isModuleFile(this.id)
    const supportModules = autoModules ? isAutoModule : options.modules

    if (supportModules) {
      plugins.unshift(require('postcss-modules')({
        generateScopedName: process.env.ROLLUP_POSTCSS_TEST ? '[name]_[local]' : '[name]_[local]__[hash:base64:5]',
        ...options.modules,
        getJSON(filepath: string, json: unknown, outpath: string) {
          modulesExported[filepath] = json
          if (typeof options.modules === 'object' && typeof options.modules.getJSON === 'function') {
            return options.modules.getJSON(filepath, json, outpath)
          }
        }
      }))
    }

    if (!shouldExtract && options.minimize) {
      plugins.push(require('cssnano')(options.minimize))
    }

    const postcssOptions: any = {
      ...this.options.postcss,
      ...(config as any).options,
      to: options.to || this.id,
      from: this.id,
      map: this.sourceMap
        ? (shouldExtract ? { inline: false, annotation: false } : { inline: true, annotation: false })
        : false
    }
    delete postcssOptions.plugins

    postcssOptions.parser = ensurePostCSSOption(postcssOptions.parser)
    postcssOptions.syntax = ensurePostCSSOption(postcssOptions.syntax)
    postcssOptions.stringifier = ensurePostCSSOption(postcssOptions.stringifier)

    if (map && postcssOptions.map) {
      postcssOptions.map.prev = typeof map === 'string' ? JSON.parse(map) : map
    }

    if (plugins.length === 0) {
      plugins.push({
        postcssPlugin: 'postcss-noop-plugin',
        Once() {}
      })
    }

    const isScoped = isScopedStyleFile(this.id)
    let scopedId = ''
    if (isScoped) {
      scopedId = createScopeId(this.id)
      plugins.push(scopedCssPlugin(scopedId))
    }

    const result = await postcss(plugins).process(code, postcssOptions)

    for (const message of result.messages) {
      if (message.type === 'dependency') {
        this.dependencies.add((message as any).file)
      }
    }
    for (const warning of result.warnings()) {
      if (!(warning as any).message) {
        ;(warning as any).message = (warning as any).text
      }
      this.warn(warning)
    }

    const outputMap = result.map && JSON.parse(result.map.toString())
    if (outputMap && outputMap.sources) {
      outputMap.sources = outputMap.sources.map((value: string) => normalizePath(value))
    }

    let output = ''
    const cssVariableName = identifier('css', true)

    if (shouldExtract) {
      if (isScoped) {
        output += `var scopedId = "${scopedId}"\nexport default scopedId;\n`
      } else {
        output += `export default ${JSON.stringify(modulesExported[this.id])};`
      }
      return { code: output, map: outputMap, extracted: { id: this.id, code: result.css, map: outputMap } }
    }

    const moduleValue = supportModules ? JSON.stringify(modulesExported[this.id]) : cssVariableName
    output +=
      `var ${cssVariableName} = ${JSON.stringify(result.css)};\n` +
      `var scopedId = ${isScoped ? `"${scopedId}"` : moduleValue};\n` +
      'export default scopedId;\n' +
      `export var stylesheet=${JSON.stringify(result.css)};`

    if (shouldInject) {
      output += typeof options.inject === 'function'
        ? options.inject(cssVariableName, this.id)
        : `\nimport styleInject from '${styleInjectPath}';\nstyleInject(${cssVariableName}${Object.keys(options.inject).length > 0 ? `,${JSON.stringify(options.inject)}` : ''});`
    }

    if (options.namedExports) {
      const json = modulesExported[this.id]
      const getClassName = typeof options.namedExports === 'function' ? options.namedExports : (name: string) => identifier(name.replace(/-+/g, m => `$${m.replace(/-/g, '_')}$`), false)
      for (const name in json) {
        const newName = getClassName(name)
        if (name !== newName && typeof options.namedExports !== 'function') {
          this.warn(`Exported "${name}" as "${newName}" in ${humanlizePath(this.id)}`)
        }
        if (!json[newName]) {
          json[newName] = json[name]
        }
        output = `export var ${newName} = ${JSON.stringify(json[name])};\n` + output
      }
    }

    return { code: output, map: outputMap, extracted: undefined }
  }
}
