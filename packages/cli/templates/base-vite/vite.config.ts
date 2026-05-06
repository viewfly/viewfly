import { defineConfig } from 'vite'
import { viewflyHmrPlugin } from '@viewfly/devtools/vite-viewfly-hmr-plugin'

export default defineConfig({
  build: {
    minify: false
  },
  plugins: [viewflyHmrPlugin()],
  server: {
    host: true,
    port: 5173
  }
})
