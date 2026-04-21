import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    minify: false
  },
  server: {
    host: true,
    port: 5173
  }
})
