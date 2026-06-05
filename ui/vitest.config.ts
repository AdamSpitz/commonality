/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { endUserDocsPlugin } from './endUserDocsPlugin'

export default defineConfig({
  plugins: [react(), endUserDocsPlugin({ domain: 'commonality', includeAll: true })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
})
