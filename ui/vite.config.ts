import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// When running inside Docker, INDEXER_URL is set to the service name (http://indexer:42069).
// When running locally, it defaults to localhost.
const indexerUrl = process.env.INDEXER_URL ?? 'http://localhost:42069';

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
      '/graphql': indexerUrl,
      '/conceptspace': indexerUrl,
      '/api': indexerUrl,
    },
  },
})
