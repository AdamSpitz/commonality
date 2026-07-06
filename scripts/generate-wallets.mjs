#!/usr/bin/env node
// Generate the operational wallets for a non-local deployment.
//
// This script writes service hot keys to .env.secrets, operator-only keys to
// ~/.secrets/commonality/operator.env, and public addresses/default-trust config
// to deployments/operator-addresses.env (gitignored).
// Save the printed secret block in your password manager too.

import { randomBytes } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const secretsPath = join(rootDir, '.env.secrets')
const operatorSecretsPath = process.env.COMMONALITY_OPERATOR_SECRETS_FILE ?? join(process.env.HOME ?? '', '.secrets', 'commonality', 'operator.env')
const walletsPath = join(rootDir, 'deployments', 'operator-addresses.env')

const force = process.argv.includes('--force')

const roles = [
  {
    label: 'Deployer',
    privateKeyEnvKey: 'DEPLOYER_PRIVATE_KEY',
    addressEnvKey: 'DEPLOYER_ADDRESS',
  },
  {
    label: 'ENS owner',
    privateKeyEnvKey: 'ENS_OWNER_PRIVATE_KEY',
    addressEnvKey: 'ENS_OWNER_ADDRESS',
  },
  {
    label: 'Implication attester',
    privateKeyEnvKey: 'IMPLICATION_ATTESTER_PRIVATE_KEY',
    addressEnvKey: 'IMPLICATION_ATTESTER_ADDRESS',
  },
  {
    label: 'Content attester',
    privateKeyEnvKey: 'CONTENT_ATTESTER_PRIVATE_KEY',
    addressEnvKey: 'CONTENT_ATTESTER_ADDRESS',
  },
  {
    label: 'Beat agent',
    privateKeyEnvKey: 'BEAT_AGENT_PRIVATE_KEY',
    addressEnvKey: 'BEAT_AGENT_ADDRESS',
  },
  {
    label: 'Channel verifier signer',
    privateKeyEnvKey: 'VERIFIER_PRIVATE_KEY',
    addressEnvKey: 'CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS',
  },
  {
    label: 'Implication graph nudger',
    privateKeyEnvKey: 'IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY',
    addressEnvKey: 'IMPLICATION_GRAPH_NUDGER_ADDRESS',
  },
  {
    label: 'Bridge creator / CSM mediator nudger',
    privateKeyEnvKey: 'BRIDGE_CREATOR_PRIVATE_KEY',
    addressEnvKey: 'BRIDGE_CREATOR_ADDRESS',
  },
  {
    label: 'Explorer curator',
    privateKeyEnvKey: 'EXPLORER_CURATOR_PRIVATE_KEY',
    addressEnvKey: 'EXPLORER_CURATOR_ADDRESS',
  },
  {
    label: 'Recurring pledge scheduler',
    privateKeyEnvKey: 'RECURRING_PLEDGE_SCHEDULER_PRIVATE_KEY',
    addressEnvKey: 'RECURRING_PLEDGE_SCHEDULER_ADDRESS',
  },
  {
    label: 'Testnet verifier mutating canary',
    privateKeyEnvKey: 'COMMONALITY_TESTNET_VERIFIER_PRIVATE_KEY',
    addressEnvKey: 'COMMONALITY_TESTNET_VERIFIER_ADDRESS',
  },
]

function parseEnv(content) {
  const entries = new Map()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    entries.set(trimmed.slice(0, index), trimmed.slice(index + 1))
  }
  return entries
}

async function readEnvFile(path) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    throw error
  }
}

function isPlaceholderValue(value) {
  return value === '' || value.includes('your_') || value.includes('0x_') || value.includes('sk-or-v1-your')
}

function findExistingKeys(content, keys) {
  if (force || !content) return new Set()
  const entries = parseEnv(content)
  return new Set(keys.filter((key) => {
    const value = entries.get(key)
    return value !== undefined && !isPlaceholderValue(value)
  }))
}

function upsertEnv(content, entries) {
  const keys = new Set(Object.keys(entries))
  const lines = content ? content.replace(/\n*$/, '').split('\n') : []
  const seen = new Set()
  const updated = lines.map((line) => {
    const trimmed = line.trim()
    const index = trimmed.indexOf('=')
    if (!trimmed || trimmed.startsWith('#') || index === -1) return line
    const key = trimmed.slice(0, index)
    if (!keys.has(key)) return line
    seen.add(key)
    return `${key}=${entries[key]}`
  })

  const missing = Object.entries(entries)
    .filter(([key]) => !seen.has(key))
    .map(([key, value]) => `${key}=${value}`)

  if (updated.length > 0 && missing.length > 0) updated.push('')
  return [...updated, ...missing].join('\n') + '\n'
}

function secret() {
  return randomBytes(32).toString('base64url')
}

const generatedRoles = roles.map((role) => {
  const privateKey = generatePrivateKey()
  const { address } = privateKeyToAccount(privateKey)
  return { ...role, privateKey, address }
})

const byPrivateKey = new Map(generatedRoles.map((role) => [role.privateKeyEnvKey, role]))
const byAddress = new Map(generatedRoles.map((role) => [role.addressEnvKey, role]))

const implicationFinderKey = secret()
const contentFinderKey = secret()
const beatAgentFinderKey = secret()

const operatorPrivateKeyNames = new Set(['DEPLOYER_PRIVATE_KEY', 'ENS_OWNER_PRIVATE_KEY'])
const privateEntries = Object.fromEntries(
  generatedRoles.filter((role) => !operatorPrivateKeyNames.has(role.privateKeyEnvKey)).map((role) => [role.privateKeyEnvKey, role.privateKey]),
)
const operatorPrivateEntries = Object.fromEntries(
  generatedRoles.filter((role) => operatorPrivateKeyNames.has(role.privateKeyEnvKey)).map((role) => [role.privateKeyEnvKey, role.privateKey]),
)
Object.assign(privateEntries, {
  IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY: implicationFinderKey,
  IMPLICATION_FINDER_ATTESTER_FINDER_KEY: implicationFinderKey,
  CONTENT_ATTESTER_TRUSTED_FINDER_KEY: contentFinderKey,
  CONTENT_FINDER_ATTESTER_FINDER_KEY: contentFinderKey,
  BEAT_AGENT_TRUSTED_FINDER_KEY: beatAgentFinderKey,
  BEAT_AGENT_FINDER_KEY: beatAgentFinderKey,
})

const implicationAttesterAddress = byAddress.get('IMPLICATION_ATTESTER_ADDRESS').address
const contentAttesterAddress = byAddress.get('CONTENT_ATTESTER_ADDRESS').address
const beatAgentAddress = byAddress.get('BEAT_AGENT_ADDRESS').address
const graphNudgerAddress = byAddress.get('IMPLICATION_GRAPH_NUDGER_ADDRESS').address
const bridgeCreatorAddress = byAddress.get('BRIDGE_CREATOR_ADDRESS').address
const explorerCuratorAddress = byAddress.get('EXPLORER_CURATOR_ADDRESS').address

const defaultNudgers = JSON.stringify([
  {
    address: graphNudgerAddress,
    name: 'Implication Graph Nudger',
    description: 'Suggests statements based on the implication graph.',
    sourceType: 'implication-graph',
  },
  {
    address: bridgeCreatorAddress,
    name: 'Common Sense Majority mediator',
    description: 'Suggests low-commitment CSM bridge statements you might be willing to sign in Tally.',
    sourceType: 'bridge-creator',
  },
  {
    address: explorerCuratorAddress,
    name: 'Fundable Project Explorer',
    description: 'Curates a map of fundable project areas and personalized suggestions.',
    sourceType: 'explorer-curator',
  },
])

const csmMediator = JSON.stringify({
  address: bridgeCreatorAddress,
  name: 'Common Sense Majority mediator',
  description: 'Suggests low-commitment CSM bridge statements you might be willing to sign in Tally.',
  sourceType: 'bridge-creator',
})

const publicEntries = Object.fromEntries(
  generatedRoles.map((role) => [role.addressEnvKey, role.address]),
)
Object.assign(publicEntries, {
  VERIFIER_ADDRESS: byPrivateKey.get('VERIFIER_PRIVATE_KEY').address,
  IMPLICATION_ATTESTER_PAYMENT_ADDRESS: implicationAttesterAddress,
  CONTENT_ATTESTER_PAYMENT_ADDRESS: contentAttesterAddress,
  BEAT_AGENT_PAYMENT_ADDRESS: beatAgentAddress,
  VITE_DEFAULT_TRUSTED_ATTESTERS: implicationAttesterAddress,
  VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS: contentAttesterAddress,
  VITE_DEFAULT_TRUSTED_BEAT_AGENTS: beatAgentAddress,
  VITE_DEFAULT_NUDGERS: defaultNudgers,
  VITE_CSM_MEDIATOR_NUDGER: csmMediator,
})

const secretsContent = await readEnvFile(secretsPath)
const operatorSecretsContent = await readEnvFile(operatorSecretsPath)
const walletsContent = await readEnvFile(walletsPath)
const skippedPrivate = findExistingKeys(secretsContent, Object.keys(privateEntries))
const skippedOperatorPrivate = findExistingKeys(operatorSecretsContent, Object.keys(operatorPrivateEntries))
const skippedPublic = findExistingKeys(walletsContent, Object.keys(publicEntries))

const filteredPrivateEntries = Object.fromEntries(
  Object.entries(privateEntries).filter(([key]) => !skippedPrivate.has(key)),
)
const filteredOperatorPrivateEntries = Object.fromEntries(
  Object.entries(operatorPrivateEntries).filter(([key]) => !skippedOperatorPrivate.has(key)),
)
const filteredPublicEntries = Object.fromEntries(
  Object.entries(publicEntries).filter(([key]) => !skippedPublic.has(key)),
)

const newSecretsContent = secretsContent
  ? upsertEnv(secretsContent, filteredPrivateEntries)
  : '# Commonality private deployment secrets. Gitignored; do not commit.\n\n' + upsertEnv('', filteredPrivateEntries)

const newOperatorSecretsContent = operatorSecretsContent
  ? upsertEnv(operatorSecretsContent, filteredOperatorPrivateEntries)
  : '# Commonality operator-only secrets. Keep outside the repo tree. Do not commit.\n\n' + upsertEnv('', filteredOperatorPrivateEntries)

const newWalletsContent = walletsContent
  ? upsertEnv(walletsContent, filteredPublicEntries)
  : [
      '# Public operational wallet addresses for the current non-local deployment.',
      '# Auto-generated by scripts/generate-wallets.mjs. Gitignored because each operator/deployment regenerates it.',
      '# These are not private keys; they are used for funding, verifier wiring, and UI default trust config.',
      '',
      ...Object.entries(filteredPublicEntries).map(([key, value]) => `${key}=${value}`),
      '',
    ].join('\n')

await mkdir(dirname(walletsPath), { recursive: true })
await mkdir(dirname(operatorSecretsPath), { recursive: true })
await writeFile(secretsPath, newSecretsContent)
await writeFile(operatorSecretsPath, newOperatorSecretsContent, { mode: 0o600 })
await writeFile(walletsPath, newWalletsContent)

console.log('=== Generated deployment wallets ===\n')
for (const role of generatedRoles) {
  console.log(role.label)
  console.log(`  ${role.privateKeyEnvKey}=${role.privateKey}`)
  console.log(`  ${role.addressEnvKey}=${role.address}`)
  console.log()
}
console.log('Finder trust secrets')
console.log(`  IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY=${implicationFinderKey}`)
console.log(`  IMPLICATION_FINDER_ATTESTER_FINDER_KEY=${implicationFinderKey}`)
console.log(`  CONTENT_ATTESTER_TRUSTED_FINDER_KEY=${contentFinderKey}`)
console.log(`  CONTENT_FINDER_ATTESTER_FINDER_KEY=${contentFinderKey}`)
console.log(`  BEAT_AGENT_TRUSTED_FINDER_KEY=${beatAgentFinderKey}`)
console.log(`  BEAT_AGENT_FINDER_KEY=${beatAgentFinderKey}`)
console.log()
console.log('Wrote:')
console.log(`  ${secretsPath}`)
console.log(`  ${operatorSecretsPath}`)
console.log(`  ${walletsPath}`)
console.log('\nSave the private keys and finder trust secrets above in your password manager.')
console.log('Fund the transaction-sending addresses in deployments/operator-addresses.env with Base Sepolia ETH before deploying.')

const skippedRoles = roles.filter(
  (role) => skippedPrivate.has(role.privateKeyEnvKey) || skippedOperatorPrivate.has(role.privateKeyEnvKey) || skippedPublic.has(role.addressEnvKey),
)
const skippedFinderPairs = [
  ['IMPLICATION_ATTESTER_TRUSTED_FINDER_KEY', 'IMPLICATION_FINDER_ATTESTER_FINDER_KEY'],
  ['CONTENT_ATTESTER_TRUSTED_FINDER_KEY', 'CONTENT_FINDER_ATTESTER_FINDER_KEY'],
  ['BEAT_AGENT_TRUSTED_FINDER_KEY', 'BEAT_AGENT_FINDER_KEY'],
].filter(([a, b]) => skippedPrivate.has(a) || skippedPrivate.has(b))

if (skippedRoles.length > 0 || skippedFinderPairs.length > 0) {
  console.log('\n=== SKIPPED (already present) ===')
  console.log('Verify both vars exist in their respective files and correspond to each other:\n')
  for (const role of skippedRoles) {
    console.log(`  ${role.privateKeyEnvKey}  (${operatorPrivateKeyNames.has(role.privateKeyEnvKey) ? operatorSecretsPath : '.env.secrets'})`)
    console.log(`  ${role.addressEnvKey}  (deployments/operator-addresses.env)`)
    console.log()
  }
  for (const [a, b] of skippedFinderPairs) {
    console.log(`  ${a}  (.env.secrets)`)
    console.log(`  ${b}  (.env.secrets)`)
    console.log()
  }
}
