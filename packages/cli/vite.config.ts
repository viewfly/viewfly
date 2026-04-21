import { builtinModules } from 'node:module'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const externals = [
  ...builtinModules,
  ...builtinModules.map(i => `node:${i}`),
  '@inquirer/prompts',
  'chalk',
  'clear',
  'commander',
  'figlet',
  'fs-extra'
]

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'index.js'
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: externals
    }
  },
  plugins: [
    dts({
      include: ['src/index.ts'],
      outDir: 'dist',
      rollupTypes: false,
      staticImport: true
    })
  ]
})
