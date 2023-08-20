import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import replace from '@rollup/plugin-replace'

// @ts-ignore
import packageJSON from './package.json' assert {type: 'json'}

export default {
  input: 'src/public-api.ts',
  output: [
    {
      file: './bundles/index.js',
      format: 'cjs'
    },
    {
      file: './bundles/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    replace({
      'process.env.version': `"${(packageJSON).version}"`
    }),
    typescript({
      compilerOptions: {
        paths: {}
      }
    })
  ]
}
