import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default {
  input: './index.ts',
  output: [
    {
      file: './index.js',
      format: 'cjs'
    },
    {
      file: './index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    typescript({
      compilerOptions: {
        paths: {}
      }
    })
  ]
}
