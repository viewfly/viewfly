import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'

const builtins = [...builtinModules, ...builtinModules.map(i => `node:${i}`)]

export default defineConfig({
  build: {
    lib: {
      entry: {
        'rollup-plugin-postcss': 'src/rollup-plugin-postcss/index.ts',
        'scoped-css-webpack-loader': 'src/scoped-css-webpack-loader/index.ts',
        'vite-scoped-css-plugin': 'src/vite-scoped-css-plugin/index.ts'
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => format === 'es' ? `${entryName}/index.esm.js` : `${entryName}/index.js`
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: [
        ...builtins,
        '@vue/component-compiler-utils',
        'chalk',
        'concat-with-sourcemaps',
        'crypto',
        'css-loader',
        'cssnano',
        'import-cwd',
        'p-queue',
        'pify',
        'postcss',
        'postcss-load-config',
        'postcss-modules',
        'postcss-selector-parser',
        'promise.series',
        'resolve',
        'rollup-plugin-postcss',
        'rollup-pluginutils',
        'safe-identifier',
        'style-inject',
        'upath',
        'vite'
      ]
    }
  }
})
