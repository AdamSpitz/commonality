#!/usr/bin/env node
// Distribute Base Sepolia ETH from one funded wallet to the operational wallets.
//
// Usage:
//   FUNDER_PRIVATE_KEY=0x... node scripts/fund-base-sepolia-wallets.mjs --amount 0.005
//
// By default this reads BASE_SEPOLIA_RPC_URL from .env.secrets/.env and addresses
// from deployments/operator-addresses.env. If FUNDER_PRIVATE_KEY is unset, it falls back to
// DEPLOYER_PRIVATE_KEY from the operator secrets file and skips sending to DEPLOYER_ADDRESS.

import { readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPublicClient,
  createWalletClient,
  formatEther,
  http,
  isAddress,
  parseEther,
} from 'viem'
import { baseSepolia } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  const args = {
    amount: '0.005',
    reserve: '0.02',
    rpcUrl: undefined,
    walletsPath: join(rootDir, 'deployments', 'operator-addresses.env'),
    only: [],
    dryRun: false,
    yes: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') args.dryRun = true
    else if (arg === '--yes' || arg === '-y') args.yes = true
    else if (arg === '--amount') args.amount = argv[++i]
    else if (arg === '--reserve') args.reserve = argv[++i]
    else if (arg === '--rpc-url') args.rpcUrl = argv[++i]
    else if (arg === '--wallets') args.walletsPath = argv[++i]
    else if (arg === '--only') args.only = argv[++i].split(',').map((value) => value.trim()).filter(Boolean)
    else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return args
}

function printHelp() {
  console.log(`Distribute Base Sepolia ETH to operational wallets.

Options:
  --amount ETH       ETH to send to each target (default: 0.005)
  --reserve ETH      ETH to leave in the funder after distributions and gas (default: 0.02)
  --rpc-url URL      Base Sepolia RPC URL (default: BASE_SEPOLIA_RPC_URL env)
  --wallets PATH     Wallet address env file (default: deployments/operator-addresses.env)
  --only LIST        Comma-separated target env keys or addresses to fund
  --dry-run          Print plan without sending transactions
  --yes, -y          Do not prompt for confirmation

Env:
  FUNDER_PRIVATE_KEY Preferred funding wallet private key
  DEPLOYER_PRIVATE_KEY Fallback funding wallet private key
  BASE_SEPOLIA_RPC_URL RPC URL
`) 
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
  try {
    return parseEnv(await readFile(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map()
    throw error
  }
}

function mergeEnv(...maps) {
  const merged = new Map()
  for (const map of maps) {
    for (const [key, value] of map) merged.set(key, value)
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) merged.set(key, value)
  }
  return merged
}

function collectTargets(walletEntries, funderAddress, only = []) {
  const excludedKeys = new Set([
    'CHANNEL_VERIFIER_TRUSTED_SIGNER_ADDRESS',
    'VERIFIER_ADDRESS',
  ])
  const onlyKeys = new Set(only.filter((value) => !isAddress(value)))
  const onlyAddresses = new Set(only.filter(isAddress).map((value) => value.toLowerCase()))
  const targets = []
  const seen = new Set([funderAddress.toLowerCase()])

  for (const [key, value] of walletEntries) {
    if (!key.endsWith('_ADDRESS')) continue
    if (excludedKeys.has(key)) continue
    if (!isAddress(value)) continue
    if (only.length > 0 && !onlyKeys.has(key) && !onlyAddresses.has(value.toLowerCase())) continue

    const normalized = value.toLowerCase()
    if (seen.has(normalized)) continue
    seen.add(normalized)
    targets.push({ key, address: value })
  }

  return targets
}

async function confirmUnlessYes(yes) {
  if (yes) return
  if (!process.stdin.isTTY) {
    throw new Error('Refusing to send without --yes in a non-interactive shell.')
  }
  process.stdout.write('Continue? Type "yes" to send transactions: ')
  const answer = await new Promise((resolve) => process.stdin.once('data', (data) => resolve(String(data).trim())))
  if (answer !== 'yes') throw new Error('Aborted.')
}

const args = parseArgs(process.argv.slice(2))
const dotEnv = await readEnvFile(join(rootDir, '.env'))
const secrets = await readEnvFile(join(rootDir, '.env.secrets'))
const operatorSecrets = await readEnvFile(process.env.COMMONALITY_OPERATOR_SECRETS_FILE ?? join(process.env.HOME ?? '', '.secrets', 'commonality', 'operator.env'))
const wallets = await readEnvFile(args.walletsPath)
const env = mergeEnv(dotEnv, secrets, operatorSecrets)

const rpcUrl = args.rpcUrl ?? env.get('BASE_SEPOLIA_RPC_URL')
if (!rpcUrl) throw new Error('Missing BASE_SEPOLIA_RPC_URL. Set it in .env.secrets, .env, operator secrets, or pass --rpc-url.')

const privateKey = env.get('FUNDER_PRIVATE_KEY') ?? env.get('DEPLOYER_PRIVATE_KEY')
if (!privateKey) throw new Error('Missing FUNDER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY.')

const account = privateKeyToAccount(privateKey)
const amount = parseEther(args.amount)
const reserve = parseEther(args.reserve)
const targets = collectTargets(wallets, account.address, args.only)
if (targets.length === 0) {
  const suffix = args.only.length > 0 ? ` matching --only ${args.only.join(',')}` : ''
  throw new Error(`No target *_ADDRESS entries${suffix} found in ${args.walletsPath}.`)
}

const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) })
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) })
const balance = await publicClient.getBalance({ address: account.address })
const fees = await publicClient.estimateFeesPerGas()
const gasLimitPerTransfer = 21_000n
const total = amount * BigInt(targets.length)
const estimatedGasCost = (fees.maxFeePerGas ?? fees.gasPrice) * gasLimitPerTransfer * BigInt(targets.length)
const required = total + estimatedGasCost + reserve

console.log(`Funder: ${account.address}`)
console.log(`Balance: ${formatEther(balance)} ETH`)
console.log(`Targets: ${targets.length}`)
for (const target of targets) console.log(`  ${target.key}=${target.address} <= ${args.amount} ETH`)
console.log(`Total to send: ${formatEther(total)} ETH`)
console.log(`Estimated transfer gas: ${formatEther(estimatedGasCost)} ETH`)
console.log(`Funder reserve: ${formatEther(reserve)} ETH`)
console.log(`Required balance: ${formatEther(required)} ETH`)

if (balance < required) {
  const shortfall = required - balance
  throw new Error(
    `Insufficient funder balance: need about ${formatEther(required)} ETH ` +
    `(${formatEther(total)} to distribute + ${formatEther(estimatedGasCost)} estimated gas + ` +
    `${formatEther(reserve)} reserve), have ${formatEther(balance)} ETH. ` +
    `Short by about ${formatEther(shortfall)} ETH. Fund ${account.address} from the Base Sepolia faucet or lower --amount/--reserve.`,
  )
}

if (args.dryRun) process.exit(0)
await confirmUnlessYes(args.yes)

let nonce = await publicClient.getTransactionCount({ address: account.address })
for (const target of targets) {
  const hash = await walletClient.sendTransaction({ to: target.address, value: amount, nonce })
  console.log(`${target.key}: ${hash}`)
  nonce += 1
}

console.log('Done. Wait for confirmations before relying on the balances.')
