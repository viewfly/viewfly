import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'

export default {
  input: './src/index.ts',
  output: [
    {
      file: './bundles/index.js',
      format: 'esm'
    }
  ],
  plugins: [
    json(),
    typescript({
      compilerOptions: {
        resolveJsonModule: false
      }
    }),
  ]
}
