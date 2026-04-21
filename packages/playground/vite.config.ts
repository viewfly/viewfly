import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import corePackage from '../core/package.json'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const workspaceRoot = path.resolve(rootDir, '../..')

export default defineConfig({
  resolve: {
    alias: {
      '@viewfly/core/jsx-runtime': path.resolve(workspaceRoot, 'packages/core/src/jsx-runtime.ts'),
      '@viewfly/core/jsx-dev-runtime': path.resolve(workspaceRoot, 'packages/core/src/jsx-runtime.ts'),
      '@viewfly/core': path.resolve(workspaceRoot, 'packages/core/src/index.ts'),
      '@viewfly/scoped-css': path.resolve(workspaceRoot, 'packages/scoped-css/src/index.ts'),
      '@viewfly/platform-browser': path.resolve(workspaceRoot, 'packages/platform-browser/src/index.ts'),
      '@viewfly/router': path.resolve(workspaceRoot, 'packages/router/src/index.ts')
    }
  },
  define: {
    'process.env.version': JSON.stringify(corePackage.version)
  },
  build: {
    minify: false
  },
  server: {
    host: true,
    port: 5656,
    open: true
  }
})
