import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'

const builtins = [...builtinModules, ...builtinModules.map(i => `node:${i}`)]

const babelExternals = [
  '@babel/core',
  '@babel/generator',
  '@babel/helper-module-imports',
  '@babel/plugin-transform-react-jsx',
  '@babel/plugin-transform-typescript',
  '@babel/types',
]

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: {
        'rollup-plugin-scoped-css': 'src/rollup-plugin-scoped-css/index.ts',
        'scoped-css-webpack-loader': 'src/scoped-css-webpack-loader/index.ts',
        'vite-scoped-css-plugin': 'src/vite-scoped-css-plugin/index.ts',
        'vite-plugin-viewfly-hmr': 'src/vite-plugin-viewfly-hmr/index.ts',
        'hmr-runtime': 'src/hmr-runtime/index.ts',
        'hmr-runtime/install': 'src/hmr-runtime/install.ts',
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (entryName === 'hmr-runtime/install') {
          return format === 'es' ? 'hmr-runtime/install.esm.js' : 'hmr-runtime/install.js'
        }
        return format === 'es' ? `${entryName}/index.esm.js` : `${entryName}/index.js`
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: [
        ...builtins,
        '@viewfly/core',
        ...babelExternals,
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
        'vite',
      ],
    },
  },
})
