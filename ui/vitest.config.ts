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
    // The component suite mocks wagmi's wallet client and exercises the plain wagmi/EOA
    // write path. ui/.env may carry real Privy vars (set for the browser Privy+Pimlico
    // spike); blank them here so useWriteClients doesn't switch into smart-wallet mode
    // (which has no client under jsdom) and silently no-op every write. Dedicated
    // Privy-mode behavior is covered where those tests set up the smart-wallet client.
    env: {
      VITE_PRIVY_APP_ID: '',
      VITE_PRIVY_SMART_WALLET_BUNDLER_URL: '',
      VITE_PRIVY_SMART_WALLET_PAYMASTER_URL: '',
    },
  },
})
