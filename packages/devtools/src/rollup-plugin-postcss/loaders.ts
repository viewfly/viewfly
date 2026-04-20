import path from 'path'
import series from 'promise.series'
import postcssLoader from './postcss-loader'
import sassLoader from './sass-loader'
import stylusLoader from './stylus-loader'
import lessLoader from './less-loader'

function matchFile(filepath: string, condition: RegExp | ((value: string) => boolean) | undefined): boolean {
  if (typeof condition === 'function') {
    return condition(filepath)
  }
  return Boolean(condition && condition.test(filepath))
}

export default class Loaders {
  private use: Array<[string, any?]>
  private loaders: Array<any>

  constructor(options: any = {}) {
    this.use = options.use.map((rule: any) => {
      if (typeof rule === 'string') return [rule]
      if (Array.isArray(rule)) return rule
      throw new TypeError('The rule in `use` option must be string or Array!')
    })
    this.loaders = []

    const extensions = options.extensions || ['.css', '.sss', '.pcss']
    const customPostcssLoader = {
      ...postcssLoader,
      test: (filepath: string) => extensions.some((ext: string) => path.extname(filepath) === ext)
    }
    this.registerLoader(customPostcssLoader)
    this.registerLoader(sassLoader)
    this.registerLoader(stylusLoader)
    this.registerLoader(lessLoader)
    if (options.loaders) {
      options.loaders.forEach((loader: any) => this.registerLoader(loader))
    }
  }

  registerLoader(loader: any) {
    const existing = this.getLoader(loader.name)
    if (existing) this.removeLoader(loader.name)
    this.loaders.push(loader)
    return this
  }

  removeLoader(name: string) {
    this.loaders = this.loaders.filter(loader => loader.name !== name)
    return this
  }

  isSupported(filepath: string): boolean {
    return this.loaders.some(loader => matchFile(filepath, loader.test))
  }

  process({ code, map }: { code: string; map?: any }, context: any) {
    return series(
      this.use.slice().reverse().map(([name, options]) => {
        const loader = this.getLoader(name)
        const loaderContext = { options: options || {}, ...context }
        return (value: any) => {
          if (loader.alwaysProcess || matchFile(loaderContext.id, loader.test)) {
            return loader.process.call(loaderContext, value)
          }
          return value
        }
      }),
      { code, map }
    )
  }

  getLoader(name: string) {
    return this.loaders.find(loader => loader.name === name)
  }
}
