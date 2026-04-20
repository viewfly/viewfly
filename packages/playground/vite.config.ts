import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import corePackage from '../core/package.json'

const rootDir = fileURLToPath(new URL('.', import.meta.url))
const workspaceRoot = path.resolve(rootDir, '../..')

export default defineConfig({
  resolve: {
    alias: {
      '@viewfly/core/jsx-runtime': path.resolve(workspaceRoot, 'packages/core/jsx-runtime'),
      '@viewfly/core/jsx-dev-runtime': path.resolve(workspaceRoot, 'packages/core/jsx-runtime'),
      '@viewfly/core': path.resolve(workspaceRoot, 'packages/core/src/public-api.ts'),
      '@viewfly/scoped-css': path.resolve(workspaceRoot, 'packages/scoped-css/src/public-api.ts'),
      '@viewfly/platform-browser': path.resolve(workspaceRoot, 'packages/platform-browser/src/public-api.ts'),
      '@viewfly/router': path.resolve(workspaceRoot, 'packages/router/src/public-api.ts')
    }
  },
  define: {
    'process.env.version': JSON.stringify(corePackage.version)
  },
  server: {
    host: true,
    port: 5656,
    open: true
  }
})
