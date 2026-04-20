import pify from 'pify'
import humanlizePath from './utils/humanlize-path'
import { loadModule } from './utils/load-module'

export default {
  name: 'less',
  test: /\.less$/,
  async process(this: any, { code }: { code: string }) {
    const less = loadModule('less')
    if (!less) {
      throw new Error('You need to install "less" packages in order to process Less files')
    }

    const { css, imports, map: lessMap } = await pify(less.render.bind(less))(code, {
      ...this.options,
      sourceMap: this.sourceMap && {},
      filename: this.id
    })

    for (const dep of imports) {
      this.dependencies.add(dep)
    }

    let map: unknown = lessMap
    if (map) {
      const parsed = JSON.parse(map as string) as { sources: string[] }
      parsed.sources = parsed.sources.map((source: string) => humanlizePath(source))
      map = parsed
    }

    return { code: css, map }
  }
}
