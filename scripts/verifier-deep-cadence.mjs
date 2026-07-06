#!/usr/bin/env node

import { spawn } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const includeTestnet = args.has('--testnet') || args.has('--browser-testnet') || args.has('--mutating-testnet') || args.has('--full')
const includeBrowserTestnet = args.has('--browser-testnet') || args.has('--full')
const includeMutatingTestnet = args.has('--mutating-testnet') || args.has('--full')

if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: node scripts/verifier-deep-cadence.mjs [--testnet] [--browser-testnet] [--mutating-testnet|--full]

Runs the guarded deep verifier checks that prove the product boots and reads back.
Intended for a nightly/CI job, not for the cheap local development loop.

By default this runs a destructive local rebuild followed by local health/E2E deep checks:
  - stack.fresh-seeded
  - operations.local-stack-health
  - stack.restart-consistency
  - operations.indexer-lag
  - artifact.ipfs-domain-smoke
  - stack.user-journeys
  - stack.deployment-depth
  - facet.functionality

--testnet additionally runs the read-only deployed testnet smoke checks and
rolls up testnet.environment. It requires the normal testnet endpoint env vars.
--browser-testnet also runs the deployed browser website journeys.
--mutating-testnet also opts into testnet.onchain-to-indexer; use only with a
provisioned, funded verifier wallet.
--full is shorthand for all testnet flags.
`)
  process.exit(0)
}

const localDeepChecks = [
  {
    checkId: 'stack.fresh-seeded',
    env: { COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE: '1' },
  },
  {
    checkId: 'operations.local-stack-health',
  },
  {
    checkId: 'stack.restart-consistency',
    env: { COMMONALITY_VERIFIER_ALLOW_RESTART: '1' },
  },
  {
    checkId: 'operations.indexer-lag',
    env: { COMMONALITY_VERIFIER_ALLOW_E2E_STACK: '1' },
  },
  {
    checkId: 'artifact.ipfs-domain-smoke',
    env: { COMMONALITY_VERIFIER_ALLOW_E2E_STACK: '1' },
  },
  {
    checkId: 'stack.user-journeys',
    env: { COMMONALITY_VERIFIER_ALLOW_E2E_STACK: '1' },
  },
]

const readOnlyTestnetChecks = [
  'testnet.dns',
  'testnet.http',
  'testnet.rpc',
  'testnet.indexer',
  'testnet.app-shell',
  'testnet.app-config',
  'testnet.contracts',
  'testnet.sponsored-gas',
].map((checkId) => ({
  checkId,
  env: { COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: '1' },
}))

const browserTestnetChecks = [
  {
    checkId: 'testnet.website-journeys',
    env: {
      COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: '1',
      COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS: '1',
    },
  },
]

const mutatingTestnetChecks = [
  {
    checkId: 'testnet.onchain-to-indexer',
    env: {
      COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: '1',
      COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION: '1',
    },
  },
]

const rollups = [
  { checkId: 'stack.deployment-depth' },
  ...(includeTestnet ? [{ checkId: 'testnet.environment' }] : []),
  { checkId: 'functionality.deep-stack' },
  { checkId: 'functionality.operations' },
  { checkId: 'facet.functionality' },
]

const checks = [
  ...localDeepChecks,
  ...(includeTestnet ? readOnlyTestnetChecks : []),
  ...(includeBrowserTestnet ? browserTestnetChecks : []),
  ...(includeMutatingTestnet ? mutatingTestnetChecks : []),
  ...rollups,
]

function parseResultStatus(stdout) {
  const start = stdout.indexOf('{')
  const end = stdout.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    return JSON.parse(stdout.slice(start, end + 1))?.status ?? null
  } catch {
    return null
  }
}

function runCheck({ checkId, env = {} }) {
  return new Promise((resolve) => {
    console.error(`\n=== verifier-run ${checkId} ===`)
    const child = spawn('verifier-run', [checkId], {
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString()
      stdout += text
      process.stdout.write(text)
    })
    child.stderr.on('data', (chunk) => {
      process.stderr.write(chunk.toString())
    })
    child.on('close', (code, signal) => resolve({ checkId, code, signal, status: parseResultStatus(stdout) }))
    child.on('error', (error) => {
      console.error(`Failed to start verifier-run ${checkId}: ${error.message}`)
      resolve({ checkId, code: 1, signal: null, status: 'error' })
    })
  })
}

const results = []
for (const check of checks) {
  results.push(await runCheck(check))
}

const failures = results.filter((result) => result.signal || result.status === 'fail' || result.status === 'error' || (result.code !== 0 && result.status !== 'uncertain'))
console.error('\n=== deep verifier cadence summary ===')
for (const result of results) {
  const detail = result.signal ? `signal ${result.signal}` : `exit ${result.code}, status ${result.status ?? 'unknown'}`
  console.error(`${failures.includes(result) ? 'FAIL' : 'PASS'} ${result.checkId} (${detail})`)
}

if (failures.length > 0) {
  console.error(`\n${failures.length}/${results.length} deep verifier checks failed or errored.`)
  process.exit(1)
}

const uncertainCount = results.filter((result) => result.status === 'uncertain').length
console.error(`\nAll ${results.length} deep verifier checks ran without fail/error status${uncertainCount > 0 ? ` (${uncertainCount} uncertain rollup(s) retained for the dashboard)` : ''}.`)
