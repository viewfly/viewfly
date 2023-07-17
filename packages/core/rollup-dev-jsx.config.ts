import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default {
  input: 'jsx.ts',
  output: [
    {
      file: './jsx-dev-runtime/index.js',
      format: 'cjs'
    },
    {
      file: './jsx-dev-runtime/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    typescript({
      tsconfig: './tsconfig-dev-jsx.json',
      compilerOptions: {
        paths: {}
      }
    })
  ]
}
