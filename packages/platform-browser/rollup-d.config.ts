import dts from 'rollup-plugin-dts'

export default {
  input: 'src/public-api.ts',
  output: [
    {
      file: './bundles/index.d.ts',
      format: 'es'
    }
  ],
  plugins: [
    dts(),
  ]
}
