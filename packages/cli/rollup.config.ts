import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

export default {
  input: 'src/public-api.ts',
  output: [
    {
      file: './bundles/index.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    typescript({
      compilerOptions: {
        paths: {}
      }
    }),
    json()
  ]
}
