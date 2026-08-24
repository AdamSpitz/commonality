import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { endUserDocsPlugin } from '../ui/endUserDocsPlugin.ts'

export default defineConfig({
  plugins: [react(), endUserDocsPlugin({ domain: 'causestarter' })],
  resolve: {
    alias: {
      '@ui': path.resolve(__dirname, '../ui/src'),
      '@commonality/sdk/published-data': path.resolve(__dirname, '../sdk/src/subsystems/published-data/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
