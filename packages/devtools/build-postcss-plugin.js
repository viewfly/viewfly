const commonjs = require('@rollup/plugin-commonjs')

module.exports = {
  input: 'src/rollup-plugin-postcss/index.js',
  output: [
    {
      file: './bundles/rollup-plugin-postcss.js',
      format: 'cjs'
    },
    {
      file: './bundles/rollup-plugin-postcss.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs()
  ]
}
