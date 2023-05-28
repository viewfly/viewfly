const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const EslintWebpackPlugin = require('eslint-webpack-plugin')
const ip = require('ip')

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index: path.resolve(__dirname, 'index.tsx')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@viewfly/core/jsx-runtime': path.resolve(__dirname, './packages/core/jsx-runtime'),
      '@viewfly/core': path.resolve(__dirname, './packages/core/src/public-api.ts'),
      '@viewfly/platform-browser': path.resolve(__dirname, './packages/platform-browser/src/public-api.ts'),
    }
  },
  devServer: {
    host: ip.address(),
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 3333,
    hot: true,
    open: true
  },
  module: {
    rules: [{
      test: /\.tsx?$/,
      use: [{
        loader: 'ts-loader',
        // options: {
        //   configFile: path.resolve(__dirname, './tsconfig-dev.json')
        // }
      }]
    }, {
      test: /\.s?css$/,
      use: ['style-loader', 'css-loader', {
        loader: 'postcss-loader',
        options: {
          postcssOptions: {
            plugins: [
              [
                'postcss-preset-env',
                {
                  // Options
                },
              ],
              [
                'autoprefixer'
              ]
            ],
          }
        }
      }, 'sass-loader'],
    }]
  },
  plugins: [
    new EslintWebpackPlugin({
      extensions: ['.ts', '.tsx'],
      exclude: [
        './index.tsx',
      ]
    }),
    new HtmlWebpackPlugin({
      template: 'index.html'
    })
  ]
}
