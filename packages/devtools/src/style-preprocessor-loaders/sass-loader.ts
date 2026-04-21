import path from 'path'
import PQueue from 'p-queue'
import pify from 'pify'
import resolve from 'resolve'
import { loadModule } from './load-module'
const threadPoolSize = Number(process.env.UV_THREADPOOL_SIZE || 4)
const workQueue = new PQueue({ concurrency: Math.max(1, threadPoolSize - 1) })
const moduleRe = /^~([a-z\d]|@).+/i
const resolvePromise = pify(resolve)
const sassModuleIds = ['sass', 'node-sass']

function getUrlOfPartial(url: string): string {
  const parsedUrl = path.parse(url)
  return `${parsedUrl.dir}${path.sep}_${parsedUrl.base}`
}

function loadSassOrThrow() {
  for (const moduleId of sassModuleIds) {
    const mod = loadModule(moduleId)
    if (mod) {
      return mod
    }
  }
  throw new Error(
    'You need to install one of the following packages: ' +
      `${sassModuleIds.map(i => `"${i}"`).join(', ')} ` +
      'in order to process SASS files'
  )
}

export default {
  name: 'sass',
  test: /\.(sass|scss)$/,
  process(this: any, { code }: { code: string }) {
    return new Promise((resolveResult, rejectResult) => {
      const sass = loadSassOrThrow()
      const render = pify(sass.render.bind(sass))
      const data = this.options.data || ''

      workQueue.add(() => render({
        ...this.options,
        file: this.id,
        data: data + code,
        indentedSyntax: /\.sass$/.test(this.id),
        sourceMap: this.sourceMap,
        importer: [
          (url: string, importer: string, done: (r: { file: string }) => void) => {
            if (!moduleRe.test(url)) {
              return done({ file: url })
            }
            const moduleUrl = url.slice(1)
            const partialUrl = getUrlOfPartial(moduleUrl)
            const options = { basedir: path.dirname(importer), extensions: ['.scss', '.sass', '.css'] }

            const finishImport = (id: string) => done({ file: id.endsWith('.css') ? id.replace(/\.css$/, '') : id })
            const next = () => done({ file: url })

            resolvePromise(partialUrl, options)
              .then((id: string) => finishImport(id))
              .catch((error: any) => {
                if (error.code === 'MODULE_NOT_FOUND' || error.code === 'ENOENT') {
                  resolvePromise(moduleUrl, options).then((id: string) => finishImport(id)).catch(next)
                } else {
                  next()
                }
              })
          }
        ].concat(this.options.importer || [])
      })
        .then((result: any) => {
          for (const file of result.stats.includedFiles) {
            this.dependencies.add(file)
          }
          resolveResult({ code: result.css.toString(), map: result.map && result.map.toString() })
        })
        .catch(rejectResult))
    })
  }
}
