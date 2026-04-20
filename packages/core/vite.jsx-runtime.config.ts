import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const dir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@viewfly/core': path.resolve(dir, 'src/public-api.ts')
    }
  },
  build: {
    lib: {
      entry: 'src/jsx-runtime.ts',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.esm.js' : 'index.js')
    },
    outDir: 'dist/jsx-runtime',
    emptyOutDir: false,
    rollupOptions: {
      external: ['@viewfly/core']
    }
  },
  plugins: [
    dts({
      include: ['src/jsx-runtime.ts'],
      outDir: 'dist/jsx-runtime',
      rollupTypes: false,
      copyDtsFiles: true,
      beforeWriteFile: (filePath, content) => {
        const out = path.resolve(dir, 'dist/jsx-runtime')
        if (!filePath.startsWith(out) || !filePath.endsWith('.d.ts')) {
          return false
        }
        const fixed = content.replaceAll('from \'./public-api.ts\'', 'from \'../index\'')
        return {
          filePath: path.join(out, 'index.d.ts'),
          content: fixed
        }
      }
    })
  ]
})
