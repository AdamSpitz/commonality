import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      events: 'events',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    proxy: {
      // Proxy GraphQL and Ponder API requests to avoid CORS issues in the browser.
      // The indexer runs at localhost:42069; the dev server runs at localhost:5173.
      '/graphql': 'http://localhost:42069',
      '/conceptspace': 'http://localhost:42069',
      '/api': 'http://localhost:42069',
    },
  },
})
