import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { endUserDocsPlugin } from './endUserDocsPlugin'

// https://vite.dev/config/
// When running inside Docker, INDEXER_URL is set to the service name (http://indexer:42069).
// When running locally, it defaults to localhost.
const indexerUrl = process.env.INDEXER_URL ?? 'http://localhost:42069';
const domain = resolveDomain(process.env.VITE_DOMAIN)

export default defineConfig(({ mode }) => {
  const env = stripUndefinedValues({ ...loadEnv(mode, process.cwd(), ''), ...process.env })

  return {
  base: mode === 'ipfs' ? './' : '/',
  build: {
    outDir: `dist/${domain}`,
  },
  plugins: [react(), runtimeConfigPlugin(domain, env), endUserDocsPlugin({ domain })],
  worker: {
    format: 'es',
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      // Use the workspace source instead of node_modules/@commonality/sdk/dist.
      // Vite serves node_modules through a transform cache and does not reliably
      // notice SDK rebuilds while the dev server is running.
      '@commonality/sdk': path.resolve(process.cwd(), '../sdk/src/index.ts'),
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

function stripUndefinedValues(env: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined))
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
    'VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS',
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
    'VITE_CHAIN_ID',
    'VITE_PAYMENT_TOKEN_SYMBOL',
    'VITE_PAYMENT_TOKEN_DECIMALS',
    'VITE_DEFAULT_TRUSTED_ATTESTERS',
    'VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS',
    'VITE_DEFAULT_TRUSTED_BEAT_AGENTS',
    'VITE_NONINFLAMMATORY_TOPIC_CID',
    'VITE_DEFAULT_NUDGERS',
    'VITE_CSM_MEDIATOR_NUDGER',
    'VITE_COMMONALITY_URL',
    'VITE_LAZYGIVING_URL',
    'VITE_ALIGNMENT_URL',
    'VITE_TALLY_URL',
    'VITE_CONTENT_FUNDING_URL',
    'VITE_CIVILITY_URL',
    'VITE_COMMON_SENSE_MAJORITY_URL',
    'VITE_NONINFLAMMATORY_URL',
    'VITE_CSM_URL',
    'VITE_CONCEPTSPACE_URL',
  ]
  return Object.fromEntries(keys.flatMap(key => env[key] ? [[key, env[key]]] : []))
}

function resolveDomain(value: string | undefined) {
  switch (value) {
    case 'commonality':
    case 'lazyGiving':
    case 'alignment':
    case 'tally':
    case 'content-funding':
    case 'civility':
    case 'common-sense-majority':
    case 'conceptspace':
      return value
    default:
      return 'commonality'
  }
}
