import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { endUserDocsPlugin } from '../ui/endUserDocsPlugin.ts'

const indexerUrl = process.env.INDEXER_URL ?? 'http://localhost:42069'

export default defineConfig(({ mode }) => {
  const env = stripUndefinedValues({ ...loadEnv(mode, process.cwd(), ''), ...process.env })

  return {
    base: mode === 'ipfs' ? './' : '/',
    build: {
      outDir: 'dist',
    },
    plugins: [
      react(),
      runtimeConfigPlugin(env),
      endUserDocsPlugin({ domain: 'causestarter' }),
    ],
    resolve: {
      preserveSymlinks: true,
      // Single React/MUI/wagmi graph when bundling ui feature modules into CauseStarter.
      dedupe: [
        'react',
        'react-dom',
        'react-router-dom',
        '@mui/material',
        '@mui/icons-material',
        '@emotion/react',
        '@emotion/styled',
        'wagmi',
        'viem',
        '@tanstack/react-query',
      ],
      alias: {
        ...sdkSourceAliases(),
        '@ui': path.resolve(process.cwd(), '../ui/src'),
        events: 'events',
      },
    },
    optimizeDeps: {
      exclude: sdkSubpathSpecifiers(),
      esbuildOptions: {
        define: {
          global: 'globalThis',
        },
      },
    },
    worker: {
      format: 'es',
    },
    server: {
      port: 5174,
      fs: {
        allow: ['..'],
      },
      proxy: {
        '/conceptspace': indexerUrl,
        '/status': indexerUrl,
        '/api/cause-assist': {
          target: process.env.CAUSE_ASSIST_URL ?? 'http://localhost:3002',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/cause-assist/, ''),
        },
        '/api/implication-attester': {
          target: process.env.IMPLICATION_ATTESTER_URL ?? 'http://localhost:3006/implication-attester',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/implication-attester/, ''),
        },
        '/api/platform-api': 'http://localhost:3001',
        '/api': indexerUrl,
      },
    },
  }
})

const SDK_SOURCE_ENTRIES: Record<string, string> = {
  machinery: 'machinery.ts',
  'indexer-sync': 'indexer-sync.ts',
  abis: 'abis.ts',
  utils: 'utils/index.ts',
  ...Object.fromEntries(
    [
      'conceptspace',
      'content-funding',
      'delegation',
      'displayable-documents',
      'fundingportals',
      'identity',
      'lazy-giving',
      'mutable-refs',
      'nudger-publications',
      'published-data',
      'signer-profiles',
      'subjectiv',
    ].map((name) => [name, `subsystems/${name}/index.ts`]),
  ),
}

function sdkSubpathSpecifiers(): string[] {
  return Object.keys(SDK_SOURCE_ENTRIES).map((name) => `@commonality/sdk/${name}`)
}

function sdkSourceAliases(): Record<string, string> {
  const src = (p: string) => path.resolve(process.cwd(), '../sdk/src', p)
  return Object.fromEntries(
    Object.entries(SDK_SOURCE_ENTRIES).map(([name, file]) => [`@commonality/sdk/${name}`, src(file)]),
  )
}

function runtimeConfigPlugin(env: Record<string, string>): Plugin {
  return {
    name: 'causestarter-runtime-config',
    closeBundle() {
      const outDir = path.resolve(process.cwd(), 'dist')
      mkdirSync(outDir, { recursive: true })
      writeFileSync(path.join(outDir, 'config.json'), `${JSON.stringify(buildRuntimeConfig(env), null, 2)}\n`)
    },
  }
}

function stripUndefinedValues(env: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  )
}

function buildRuntimeConfig(env: Record<string, string>) {
  const keys = [
    'VITE_EVENT_CACHE_URL',
    'VITE_IPFS_GATEWAY',
    'COMMONALITY_ENVIRONMENT',
    'VITE_PLATFORM_API_URL',
    'VITE_CAUSE_ASSIST_URL',
    'VITE_IMPLICATION_ATTESTER_URL',
    'VITE_MAINNET_RPC_URL',
    'VITE_ETH_RPC_URL',
    'VITE_BELIEFS_CONTRACT_ADDRESS',
    'VITE_IMPLICATIONS_CONTRACT_ADDRESS',
    'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS',
    'VITE_ERC1155_FACTORY_ADDRESS',
    'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS',
    'VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS',
    'VITE_NOTE_INTENT_CONTRACT_ADDRESS',
    'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
    'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS',
    'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS',
    'VITE_DEFAULT_ALIGNMENT_TRUST_ROOT',
    'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS',
    'VITE_DEFAULT_NUDGERS',
    'VITE_PUBLISHED_DATA_CONTRACT_ADDRESS',
    'VITE_CONTENT_REGISTRY_ADDRESS',
    'VITE_CHANNEL_REGISTRY_ADDRESS',
    'VITE_CHANNEL_ESCROW_ADDRESS',
    'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS',
    'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS',
    'VITE_PAYMENT_TOKEN_ADDRESS',
    'VITE_CHAIN_ID',
    'VITE_PAYMENT_TOKEN_SYMBOL',
    'VITE_PAYMENT_TOKEN_DECIMALS',
    'VITE_COMMONALITY_URL',
    'VITE_LAZYGIVING_URL',
    'VITE_ALIGNMENT_URL',
    'VITE_TALLY_URL',
    'VITE_CONTENT_FUNDING_URL',
    'VITE_CIVILITY_URL',
    'VITE_COMMON_SENSE_MAJORITY_URL',
    'VITE_CONCEPTSPACE_URL',
  ]
  return Object.fromEntries(keys.flatMap((key) => (env[key] ? [[key, env[key]]] : [])))
}
