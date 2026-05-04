import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// When running inside Docker, INDEXER_URL is set to the service name (http://indexer:42069).
// When running locally, it defaults to localhost.
const indexerUrl = process.env.INDEXER_URL ?? 'http://localhost:42069';
const domain = resolveDomain(process.env.VITE_DOMAIN)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  base: mode === 'ipfs' ? './' : '/',
  build: {
    outDir: `dist/${domain}`,
  },
  plugins: [react(), runtimeConfigPlugin(domain, env)],
  worker: {
    format: 'es',
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      events: 'events',
    },
  },
  optimizeDeps: {
    // The SDK is a local workspace package that changes during E2E runs. Do not
    // prebundle/cache it, or Vite can keep stale RPC defaults from sdk/dist.
    exclude: ['@commonality/sdk'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      // Proxy GraphQL and Ponder API requests to avoid CORS issues in the browser.
      // The indexer runs at localhost:42069; the dev server runs at localhost:5173.
      '/graphql': indexerUrl,
      '/conceptspace': indexerUrl,
      // /status is polled by waitForIndexerToSyncToTxHash in E2E tests
      '/status': indexerUrl,
      '/api': indexerUrl,
      // Proxy platform-api-service requests (runs at localhost:3001)
      '/api/platform-api': 'http://localhost:3001',
    },
  },
}
})

function runtimeConfigPlugin(buildDomain: string, env: Record<string, string>): Plugin {
  return {
    name: 'commonality-runtime-config',
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist', buildDomain)
      mkdirSync(outDir, { recursive: true })
      writeFileSync(path.join(outDir, 'config.json'), `${JSON.stringify(buildRuntimeConfig(env), null, 2)}\n`)
    },
  }
}

function buildRuntimeConfig(env: Record<string, string>) {
  const keys = [
    'VITE_GRAPHQL_URL',
    'VITE_EVENT_CACHE_URL',
    'VITE_IPFS_GATEWAY',
    'VITE_IPFS_API',
    'COMMONALITY_ENVIRONMENT',
    'VITE_PLATFORM_API_URL',
    'VITE_ENABLE_CHANNEL_METADATA_LOOKUP',
    'VITE_MAINNET_RPC_URL',
    'VITE_ETH_RPC_URL',
    'VITE_BELIEFS_CONTRACT_ADDRESS',
    'VITE_IMPLICATIONS_CONTRACT_ADDRESS',
    'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS',
    'VITE_ERC1155_FACTORY_ADDRESS',
    'VITE_MARKETPLACE_FACTORY_ADDRESS',
    'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS',
    'VITE_NOTE_INTENT_CONTRACT_ADDRESS',
    'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
    'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
    'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS',
    'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
    'VITE_CONTENT_REGISTRY_ADDRESS',
    'VITE_CHANNEL_REGISTRY_ADDRESS',
    'VITE_CHANNEL_ESCROW_ADDRESS',
    'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS',
    'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS',
    'VITE_PAYMENT_TOKEN_ADDRESS',
    'VITE_DEFAULT_TRUSTED_ATTESTERS',
    'VITE_DEFAULT_NUDGERS',
  ]
  return Object.fromEntries(keys.flatMap(key => env[key] ? [[key, env[key]]] : []))
}

function resolveDomain(value: string | undefined) {
  switch (value) {
    case 'commonality':
    case 'tally':
    case 'content-funding':
    case 'noninflammatory':
    case 'csm':
    case 'conceptspace':
      return value
    default:
      return 'commonality'
  }
}
