import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'

const builtins = [...builtinModules, ...builtinModules.map(i => `node:${i}`)]

export default defineConfig({
  build: {
    lib: {
      entry: {
        'rollup-plugin-scoped-css': 'src/rollup-plugin-scoped-css/index.ts',
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
        'concat-with-sourcemaps',
        'css-loader',
        'import-cwd',
        'p-queue',
        'pify',
        'postcss',
        'resolve',
        'rollup-pluginutils',
        'style-inject',
        'vite'
      ]
    }
  }
})
