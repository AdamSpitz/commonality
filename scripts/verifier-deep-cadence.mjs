#!/usr/bin/env node

import { spawn } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const includeTestnet = args.has('--testnet') || args.has('--full')
const includeMutatingTestnet = args.has('--mutating-testnet') || args.has('--full')

if (args.has('--help') || args.has('-h')) {
  console.log(`Usage: node scripts/verifier-deep-cadence.mjs [--testnet] [--mutating-testnet|--full]

Runs the guarded deep verifier checks that prove the product boots and reads back.
Intended for a nightly/CI job, not for the cheap local development loop.

By default this runs local health plus local destructive/E2E deep checks:
  - operations.local-stack-health
  - stack.fresh-seeded
  - stack.restart-consistency
  - artifact.ipfs-domain-smoke
  - stack.user-journeys
  - operations.indexer-lag
  - stack.deployment-depth
  - facet.functionality

--testnet additionally runs the read-only deployed testnet smoke checks and
rolls up testnet.environment. It requires the normal testnet endpoint env vars.
--mutating-testnet also opts into testnet.onchain-to-indexer and
website-journeys; use only with a provisioned verifier wallet.
--full is shorthand for both testnet flags.
`)
  process.exit(0)
}

const localDeepChecks = [
  {
    checkId: 'operations.local-stack-health',
  },
  {
    checkId: 'stack.fresh-seeded',
    env: { COMMONALITY_VERIFIER_ALLOW_DESTRUCTIVE: '1' },
  },
  {
    checkId: 'stack.restart-consistency',
    env: { COMMONALITY_VERIFIER_ALLOW_RESTART: '1' },
  },
  {
    checkId: 'artifact.ipfs-domain-smoke',
    env: { COMMONALITY_VERIFIER_ALLOW_E2E_STACK: '1' },
  },
  {
    checkId: 'stack.user-journeys',
    env: { COMMONALITY_VERIFIER_ALLOW_E2E_STACK: '1' },
  },
  {
    checkId: 'operations.indexer-lag',
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

const mutatingTestnetChecks = [
  {
    checkId: 'testnet.onchain-to-indexer',
    env: {
      COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: '1',
      COMMONALITY_VERIFIER_ENABLE_TESTNET_MUTATION: '1',
    },
  },
  {
    checkId: 'testnet.website-journeys',
    env: {
      COMMONALITY_VERIFIER_ENABLE_TESTNET_SMOKE: '1',
      COMMONALITY_VERIFIER_ENABLE_TESTNET_BROWSER_JOURNEYS: '1',
    },
  },
]

const rollups = [
  { checkId: 'stack.deployment-depth' },
  ...(includeTestnet ? [{ checkId: 'testnet.environment' }] : []),
  { checkId: 'facet.functionality' },
]

const checks = [
  ...localDeepChecks,
  ...(includeTestnet ? readOnlyTestnetChecks : []),
  ...(includeMutatingTestnet ? mutatingTestnetChecks : []),
  ...rollups,
]

function runCheck({ checkId, env = {} }) {
  return new Promise((resolve) => {
    console.error(`\n=== verifier-run ${checkId} ===`)
    const child = spawn('verifier-run', [checkId], {
      env: { ...process.env, ...env },
      stdio: 'inherit',
    })
    child.on('close', (code, signal) => resolve({ checkId, code, signal }))
    child.on('error', (error) => {
      console.error(`Failed to start verifier-run ${checkId}: ${error.message}`)
      resolve({ checkId, code: 1, signal: null })
    })
  })
}

const results = []
for (const check of checks) {
  results.push(await runCheck(check))
}

const failures = results.filter((result) => result.code !== 0 || result.signal)
console.error('\n=== deep verifier cadence summary ===')
for (const result of results) {
  const detail = result.signal ? `signal ${result.signal}` : `exit ${result.code}`
  console.error(`${failures.includes(result) ? 'FAIL' : 'PASS'} ${result.checkId} (${detail})`)
}

if (failures.length > 0) {
  console.error(`\n${failures.length}/${results.length} deep verifier checks failed.`)
  process.exit(1)
}

console.error(`\nAll ${results.length} deep verifier checks passed.`)
