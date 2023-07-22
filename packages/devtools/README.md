Viewfly
================================

Viewfly 是一个简单、数据驱动的前端框架。

此项目为 Viewfly 的开发工具包，详情请参考官方网站：[viewfly.org](https://viewfly.org)

## 安装
```
npm install @viewfly/devtools -D
```

## scoped-css-webpack-loader

让 css 支持 Viewfly 作用域样式的 webpack loader。直接在 webpack 配置中替换 css-loader 即可。

```js
{
  test: /\.s?css$/,
  use: [
    'style-loader',
    // 'css-loader',
    ''
  ]
}
```




