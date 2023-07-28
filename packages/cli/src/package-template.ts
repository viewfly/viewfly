export function packageTemplate(name: string) {
  return `{
  "name": "${name}",
  "version": "1.0.0",
  "description": "Viewfly project.",
  "main": "src/index.tsx",
  "scripts": {
    "start": "webpack-dev-server",
    "build": "rimraf dist && webpack --mode=production",
    "test": "echo \\"Error: no test specified\\" && exit 1"
  },
  "dependencies": {
    "@viewfly/core": "^0.0.20",
    "@viewfly/hooks": "^0.0.20",
    "@viewfly/platform-browser": "^0.0.20",
    "@viewfly/router": "^0.0.20",
    "@viewfly/scoped-css": "^0.0.20"
  },
  "devDependencies": {
    "@babel/core": "^7.16.5",
    "@babel/preset-env": "^7.16.5",
    "@types/jest": "^29.5.2",
    "@typescript-eslint/eslint-plugin": "^5.8.0",
    "@typescript-eslint/parser": "^5.8.0",
    "@viewfly/devtools": "^0.0.20",
    "autoprefixer": "^10.4.0",
    "babel-plugin-transform-es2015-modules-commonjs": "^6.26.2",
    "core-js": "^3.20.1",
    "cross-env": "^7.0.3",
    "css-loader": "^6.8.1",
    "eslint": "^8.5.0",
    "eslint-webpack-plugin": "^3.1.1",
    "extract-loader": "^5.1.0",
    "file-loader": "^6.2.0",
    "html-webpack-plugin": "^5.5.0",
    "ip": "^1.1.5",
    "less": "^4.1.3",
    "less-loader": "^11.1.3",
    "mini-css-extract-plugin": "^2.4.5",
    "postcss": "^8.4.24",
    "postcss-loader": "^7.3.3",
    "postcss-preset-env": "^8.5.0",
    "rimraf": "^5.0.1",
    "sass": "^1.63.4",
    "sass-loader": "^10.4.1",
    "style-loader": "^3.3.3",
    "ts-loader": "^9.4.4",
    "typescript": "^5.1.6",
    "webpack": "^5.65.0",
    "webpack-cli": "^4.10.0",
    "webpack-dev-server": "^4.7.1"
  }
}
`
}
