const commonjs = require('@rollup/plugin-commonjs')

module.exports = {
  input: 'src/vite-scoped-css-plugin/index.js',
  output: [
    {
      file: './vite-scoped-css-plugin/index.js',
      format: 'cjs'
    },
    {
      file: './vite-scoped-css-plugin/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs()
  ]
}
