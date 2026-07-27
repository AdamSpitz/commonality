/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { endUserDocsPlugin } from './endUserDocsPlugin'

// Some tests read files from outside this workspace — CrossLinkCrawler.test.tsx
// globs ../../../docs/end-user. Vite only infers a workspace root wide enough to
// permit that when it is launched from this directory, so `vitest run --root ui`
// from the repo root would fail with "Denied ID .../docs/end-user/....md?raw".
// Anchoring to the repo root (relative to this file, not to cwd) makes every
// invocation behave the same. Mirrors server.fs.allow in vite.config.ts.
const repoRoot = fileURLToPath(new URL('..', import.meta.url))

export default defineConfig({
  plugins: [react(), endUserDocsPlugin({ domain: 'commonality', includeAll: true })],
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
  },
})
