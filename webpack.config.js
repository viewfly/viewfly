const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const ip = require('ip')

const ENV_ROUTER = process.env.ENV === 'ROUTER'

module.exports = {
  mode: 'development',
  devtool: 'cheap-module-source-map',
  entry: {
    index: path.resolve(__dirname, ENV_ROUTER ? 'router-index.tsx' : 'index.tsx')
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
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
  devServer: {
    host: ip.address(),
    historyApiFallback: true,
    static: {
      directory: path.join(__dirname, 'dist')
    },
    compress: true,
    port: 3333,
    hot: true,
    open: true
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: path.resolve(__dirname, 'test'),
        use: [{ loader: 'ts-loader' }]
      },
      {
        test: /\.s?css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[local]__[hash:base64:5]'
              }
            }
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [
                  ['postcss-preset-env'],
                  ['autoprefixer']
                ]
              }
            }
          },
          'sass-loader'
        ],
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'index.html',
      publicPath: '/'
    })
  ]
}
