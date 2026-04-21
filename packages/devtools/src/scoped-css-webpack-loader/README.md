# `@viewfly/devtools/scoped-css-webpack-loader`

Webpack loader：对匹配 `*.scoped.(css|scss|sass|less|styl|stylus)` 的资源先做与 Vite/Rollup 相同的 **scoped 编译**（`transformScopedStyle`），再交给 **`css-loader`**；非 scoped 文件则 **直接透传** 给 `css-loader`，因此可在同一条 `use` 链上替代原先的 `css-loader` 位置（仍需在其前配置 `style-loader` / `MiniCssExtractPlugin.loader` 等）。

## 安装

```bash
npm install @viewfly/devtools css-loader style-loader -D
```

预处理器（sass / less / stylus）若需单独处理，请在更上游增加对应 loader；本 loader 只处理已进入 CSS 文本且路径符合 scoped 约定的文件。

## 使用

典型链：**`style-loader`** → **本 loader**（内部会 `css-loader.apply`）。

```js
// webpack.config.cjs
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          require.resolve('@viewfly/devtools/scoped-css-webpack-loader')
        ]
      }
    ]
  }
}
```

若需同时匹配 `scss`，可将 `test` 改为 `/\.s?css$/` 并自行在链上加入 `sass-loader` 等，保证进入本 loader 的已是 CSS 字符串且 `resource` 仍为 `*.scoped.*` 路径。

## 文件约定

- 仅当 `resource` 匹配 `isScopedStyleFile`（即 `*.scoped.(css|scss|sass|less|styl|stylus)`）时走 scoped 分支。
- `scopeId` 使用 `createScopeId(resource, rootContext || process.cwd())`，与 Vite、Rollup 插件一致。

## 在应用代码里使用 `scopeId`

对 scoped 样式模块使用默认导入；在 **css-loader** 产物上本 loader 会补丁写入 `locals` 为 `scopeId` 字符串，故 ESM 下 `import scope from './x.scoped.css'` 的 `default` 即为 `vf-xxxxxx`：

```js
import scopeA from './a.scoped.css'
import scopeB from './b.scoped.css'

document.getElementById('box-a')?.setAttribute(scopeA, '')
document.getElementById('box-b')?.setAttribute(scopeB, '')
```

## 实现说明

- Scoped 分支：`transformScopedStyle` → `cssLoader.apply(this, [code, map])`。
- 非 scoped：`cssLoader.apply(this, [source, map, meta])`，行为与仅使用 `css-loader` 一致。
