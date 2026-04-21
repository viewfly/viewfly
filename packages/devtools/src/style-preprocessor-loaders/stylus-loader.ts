import pify from 'pify'
import { loadModule } from './load-module'

export default {
  name: 'stylus',
  test: /\.(styl|stylus)$/,
  async process(this: any, { code }: { code: string }) {
    const stylus = loadModule('stylus')
    if (!stylus) {
      throw new Error('You need to install "stylus" packages in order to process Stylus files')
    }

    const style = stylus(code, {
      ...this.options,
      filename: this.id,
      sourcemap: this.sourceMap && {}
    })

    const css = await pify(style.render.bind(style))()
    for (const dep of style.deps()) {
      this.dependencies.add(dep)
    }

    return { code: css, map: style.sourcemap }
  }
}
