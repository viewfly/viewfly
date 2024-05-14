const commonjs = require('@rollup/plugin-commonjs')

module.exports = {
  input: 'src/scoped-css-webpack-loader/index.js',
  output: [
    {
      file: './scoped-css-webpack-loader/index.js',
      format: 'cjs'
    },
    {
      file: './scoped-css-webpack-loader/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs()
  ]
}
