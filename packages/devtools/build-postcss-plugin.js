const commonjs = require('@rollup/plugin-commonjs')

module.exports = {
  input: 'src/rollup-plugin-postcss/index.js',
  output: [
    {
      file: './rollup-plugin-postcss/index.js',
      format: 'cjs'
    },
    {
      file: './rollup-plugin-postcss/index.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs()
  ]
}
