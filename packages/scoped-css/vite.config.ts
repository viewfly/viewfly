import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    minify: false,
    lib: {
      entry: 'src/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.esm.js' : 'index.js'
    },
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      external: ['@viewfly/core']
    }
  },
  plugins: [
    dts({
      include: ['src'],
      entryRoot: 'src',
      outDir: 'dist',
      rollupTypes: false,
      pathsToAliases: false,
      insertTypesEntry: false
    })
  ]
})
