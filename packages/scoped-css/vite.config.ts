import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/public-api.ts',
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
      rollupTypes: true,
      insertTypesEntry: false
    })
  ]
})
