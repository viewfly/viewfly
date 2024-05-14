const commonjs = require('@rollup/plugin-commonjs')

module.exports = {
  input: 'src/scoped-css-webpack-loader/index.js',
  output: [
    {
      file: './bundles/scoped-css-webpack-loader.js',
      format: 'cjs'
    },
    {
      file: './bundles/scoped-css-webpack-loader.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs()
  ]
}
