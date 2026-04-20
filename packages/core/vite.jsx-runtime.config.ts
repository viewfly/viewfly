import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'jsx-runtime/index.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => format === 'es' ? 'index.esm.js' : 'index.js'
    },
    outDir: 'dist/jsx-runtime',
    emptyOutDir: false,
    rollupOptions: {
      external: ['@viewfly/core']
    }
  },
  plugins: [
    dts({
      include: ['jsx-runtime/index.ts'],
      outDir: 'dist/jsx-runtime',
      beforeWriteFile: (filePath, content) => {
        if (filePath.endsWith('jsx-runtime/index.d.ts')) {
          return {
            filePath: filePath.replace(/jsx-runtime[\\/]+index\.d\.ts$/, 'index.d.ts'),
            content
          }
        }
        return false
      }
    })
  ]
})
