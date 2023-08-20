const path = require('path')
const webpack = require('webpack')
const corePackage = require('./packages/core/package.json')

module.exports = {
  mode: 'production',
  entry: {
    index: path.resolve(__dirname, './lib.ts')
  },
  output: {
    path: path.resolve(__dirname, './bundles'),
    filename: 'viewfly.min.js',
    libraryTarget: 'umd',
    library: 'viewfly',
    umdNamedDefine: true
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@viewfly/core/jsx-runtime': path.resolve(__dirname, './packages/core/jsx-runtime'),
      '@viewfly/core': path.resolve(__dirname, './packages/core/src/public-api.ts'),
      '@viewfly/scoped-css': path.resolve(__dirname, './packages/scoped-css/src/public-api.ts'),
      '@viewfly/platform-browser': path.resolve(__dirname, './packages/platform-browser/src/public-api.ts'),
      '@viewfly/hooks': path.resolve(__dirname, './packages/hooks/src/public-api.ts'),
      '@viewfly/router': path.resolve(__dirname, './packages/router/src/public-api.ts'),
    }
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [{
        loader: 'ts-loader',
        options: {
          compilerOptions: {
            declaration: false
          }
        }
      }]
    }]
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.version': `"${corePackage.version}"`
    }),
  ]
}
