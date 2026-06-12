#!/usr/bin/env node
/**
 * Generate per-service secret blocks for pasting into the Render dashboard
 * "Add from .env" bulk-import box.
 *
 * Usage:
 *   node scripts/generate-render-secrets.mjs [network-env-file]
 *
 * Default env file: deployments/base-sepolia.env
 *
 * Reads from (all gitignored):
 *   .env.secrets
 *   deployments/operator-addresses.env
 *   deployments/<network>.env  (for non-secret values like RPC URLs that came
 *                               from base-sepolia.env — currently none, but
 *                               kept for completeness)
 *
 * Prints one block per service, labelled, ready to paste.
 */

import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const networkEnvFile = process.argv[2] ?? join(rootDir, 'deployments', 'base-sepolia.env')

function parseEnvFile(content) {
  const result = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx)
    const value = trimmed.slice(idx + 1).replace(/^"(.*)"$/, '$1')
    result[key] = value
  }
  return result
}

async function loadEnv(filePath) {
  try {
    return parseEnvFile(await readFile(filePath, 'utf-8'))
  } catch {
    console.warn(`Warning: could not read ${filePath}`)
    return {}
  }
}

const secrets = await loadEnv(join(rootDir, '.env.secrets'))
const wallets = await loadEnv(join(rootDir, 'deployments', 'operator-addresses.env'))
const networkEnv = await loadEnv(networkEnvFile)

// Merged lookup: secrets take priority, then wallets, then network env.
const all = { ...networkEnv, ...wallets, ...secrets }

function get(key) {
  const val = all[key]
  if (!val) console.warn(`  Warning: ${key} not found in any env file`)
  return val ?? `MISSING:${key}`
}

function block(pairs) {
  return pairs.map(([k, v]) => `${k}=${v}`).join('\n')
}

const services = {
  'commonality-indexer': () => block([
    ['PONDER_CHAIN', 'base-sepolia'],
    ['PONDER_RPC_URL_84532', get('BASE_SEPOLIA_RPC_URL')],
    ['PONDER_RPC_URL_1', get('MAINNET_RPC_URL')],
  ]),

  'commonality-service-host-attesters': () => block([
    ['ETHEREUM_RPC_URL', get('BASE_SEPOLIA_RPC_URL')],
    ['OPENROUTER_API_KEY', get('OPENROUTER_API_KEY')],
    ['IMPLICATION_ATTESTER_PRIVATE_KEY', get('IMPLICATION_ATTESTER_PRIVATE_KEY')],
    ['IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY', get('IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY')],
    ['CONTENT_ATTESTER_PRIVATE_KEY', get('CONTENT_ATTESTER_PRIVATE_KEY')],
    ['CONTENT_ATTESTER_TRUSTED_FINDER_KEY', get('CONTENT_ATTESTER_TRUSTED_FINDER_KEY')],
    ['ALIGNMENT_TOPIC_STATEMENT_CID', get('ALIGNMENT_TOPIC_STATEMENT_CID')],
    ['BEAT_AGENT_PRIVATE_KEY', get('BEAT_AGENT_PRIVATE_KEY')],
    ['BEAT_AGENT_TRUSTED_FINDER_KEY', get('BEAT_AGENT_TRUSTED_FINDER_KEY')],
    ['X_API_BEARER_TOKEN', get('X_API_BEARER_TOKEN')],
  ]),

  'commonality-platform-api': () => block([
    ['ETHEREUM_RPC_URL', get('BASE_SEPOLIA_RPC_URL')],
    ['VERIFIER_PRIVATE_KEY', get('VERIFIER_PRIVATE_KEY')],
    ['X_API_BEARER_TOKEN', get('X_API_BEARER_TOKEN')],
    ['YOUTUBE_API_KEY', get('YOUTUBE_API_KEY')],
  ]),

  'commonality-service-host-workers': () => block([
    ['ETHEREUM_RPC_URL', get('BASE_SEPOLIA_RPC_URL')],
    ['OPENROUTER_API_KEY', get('OPENROUTER_API_KEY')],
    ['CONTENT_FINDER_ATTESTER_FINDER_KEY', get('CONTENT_FINDER_ATTESTER_FINDER_KEY')],
    ['IMPLICATION_FINDER_ATTESTER_FINDER_KEY', get('IMPLICATION_FINDER_ATTESTER_FINDER_KEY')],
    ['IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY', get('IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY')],
    ['BRIDGE_CREATOR_PRIVATE_KEY', get('BRIDGE_CREATOR_PRIVATE_KEY')],
    ['EXPLORER_CURATOR_PRIVATE_KEY', get('EXPLORER_CURATOR_PRIVATE_KEY')],
  ]),
}

const separator = '='.repeat(60)

for (const [name, generate] of Object.entries(services)) {
  console.log(`\n${separator}`)
  console.log(`SERVICE: ${name}`)
  console.log(separator)
  console.log(generate())
}

console.log(`\n${separator}`)
console.log('Done. Paste each block into the service\'s Environment tab in Render.')
console.log(separator)
