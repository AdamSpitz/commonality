#!/usr/bin/env node
// Send Base Sepolia ETH to CONTRACT_ADMIN_ADDRESS.
//
// Usage:
//   node scripts/fund-contract-admin.mjs [--amount 0.05] [--dry-run] [--yes]
//
// Reads FUNDER_PRIVATE_KEY (or DEPLOYER_PRIVATE_KEY) and BASE_SEPOLIA_RPC_URL
// from the same env sources as fund-base-sepolia-wallets.mjs.

import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  parseEther,
} from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = { amount: '0.05', dryRun: false, yes: false, rpcUrl: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--yes' || arg === '-y') args.yes = true
    else if (arg === '--amount') args.amount = argv[++i]
    else if (arg === '--rpc-url') args.rpcUrl = argv[++i]
    else { console.error(`Unknown argument: ${arg}`); process.exit(1) }
  }
  return args
}

function parseEnv(content) {
  const entries = new Map()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    entries.set(trimmed.slice(0, index), trimmed.slice(index + 1).replace(/^['"]|['"]$/g, ''))
  }
  return entries
}

async function readEnvFile(path) {
  try { return parseEnv(await readFile(path, 'utf8')) }
  catch (e) { if (e?.code === 'ENOENT') return new Map(); throw e }
}

const args = parseArgs(process.argv.slice(2))

const dotEnv = await readEnvFile(join(rootDir, '.env'))
const secrets = await readEnvFile(join(rootDir, '.env.secrets'))
const operatorSecrets = await readEnvFile(
  process.env.COMMONALITY_OPERATOR_SECRETS_FILE ??
  join(process.env.HOME ?? '', '.secrets', 'commonality', 'operator.env'),
)
const operatorAddresses = await readEnvFile(join(rootDir, 'deployments', 'operator-addresses.env'))

const env = new Map([...dotEnv, ...secrets, ...operatorSecrets, ...Object.entries(process.env)])

const rpcUrl = args.rpcUrl ?? env.get('BASE_SEPOLIA_RPC_URL')
if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL.')

const privateKey = env.get('FUNDER_PRIVATE_KEY') ?? env.get('DEPLOYER_PRIVATE_KEY')
if (!privateKey) throw new Error('Missing FUNDER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY.')

const to = operatorAddresses.get('CONTRACT_ADMIN_ADDRESS')
if (!to) throw new Error('CONTRACT_ADMIN_ADDRESS not found in deployments/operator-addresses.env.')

const account = privateKeyToAccount(privateKey)
const amount = parseEther(args.amount)

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) })

const balance = await publicClient.getBalance({ address: account.address })
const fees = await publicClient.estimateFeesPerGas()
const estimatedGas = (fees.maxFeePerGas ?? fees.gasPrice) * 21_000n

console.log(`Funder:           ${account.address}`)
console.log(`Funder balance:   ${formatEther(balance)} ETH`)
console.log(`To:               ${to} (CONTRACT_ADMIN_ADDRESS)`)
console.log(`Amount:           ${args.amount} ETH`)
console.log(`Estimated gas:    ${formatEther(estimatedGas)} ETH`)

if (balance < amount + estimatedGas) {
  throw new Error(
    `Insufficient balance: need ~${formatEther(amount + estimatedGas)} ETH, have ${formatEther(balance)} ETH.`,
  )
}

if (args.dryRun) { console.log('Dry run — no transaction sent.'); process.exit(0) }

if (!args.yes) {
  if (!process.stdin.isTTY) throw new Error('Refusing to send without --yes in non-interactive shell.')
  process.stdout.write('Continue? Type "yes" to send: ')
  const answer = await new Promise((resolve) => process.stdin.once('data', (d) => resolve(String(d).trim())))
  if (answer !== 'yes') throw new Error('Aborted.')
}

const hash = await walletClient.sendTransaction({ to, value: amount })
console.log(`Sent: ${hash}`)
