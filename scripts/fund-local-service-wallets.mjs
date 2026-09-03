#!/usr/bin/env node
/**
 * Local-only: top up the service signer wallets on the Hardhat chain.
 *
 * Hardhat prefunds its own ten accounts, and docker-compose falls back to those
 * keys — but `docker compose` also auto-loads the root `.env`, and once
 * `generate-wallets.mjs` has run that file holds freshly generated keys with no
 * balance on a local chain. A service then boots, reports `degraded`, and fails
 * every on-chain write. This tops such wallets up from Hardhat account #0.
 *
 * Idempotent: wallets already above the floor are left alone. Guarded to
 * chain 31337 so it can never move funds on a real network.
 */
import { createPublicClient, createWalletClient, formatEther, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'

/** Hardhat account #0 — prefunded, and only ever used on chain 31337. */
const FUNDER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

/** Env vars holding a service signer key that needs gas on the local chain. */
const SIGNER_KEY_VARS = [
  'IMPLICATION_ATTESTER_PRIVATE_KEY',
  'CONTENT_ATTESTER_PRIVATE_KEY',
  'BRIDGE_CREATOR_PRIVATE_KEY',
]

const FLOOR = parseEther('1')
const TOP_UP = parseEther('10')

function signerAddresses() {
  const seen = new Map()
  for (const name of SIGNER_KEY_VARS) {
    const key = process.env[name]?.trim()
    if (!key || !/^0x[0-9a-fA-F]{64}$/.test(key)) continue
    let address
    try {
      address = privateKeyToAccount(key).address
    } catch {
      console.warn(`  ${name}: not a usable private key, skipping.`)
      continue
    }
    if (!seen.has(address)) seen.set(address, name)
  }
  return [...seen.entries()]
}

async function main() {
  const rpcUrl = process.env.ETH_RPC_URL ?? 'http://127.0.0.1:8545'
  const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) })

  const chainId = await publicClient.getChainId()
  if (chainId !== 31337) {
    throw new Error(`Refusing to fund wallets on chain ${chainId}; this script is local-Hardhat only.`)
  }

  const targets = signerAddresses()
  if (targets.length === 0) {
    console.log('No service signer keys configured; nothing to fund.')
    return
  }

  const funder = privateKeyToAccount(FUNDER_KEY)
  const wallet = createWalletClient({ account: funder, chain: hardhat, transport: http(rpcUrl) })

  for (const [address, name] of targets) {
    const balance = await publicClient.getBalance({ address })
    if (balance >= FLOOR) {
      console.log(`  ${name} (${address}): ${formatEther(balance)} ETH, already funded.`)
      continue
    }
    const hash = await wallet.sendTransaction({ to: address, value: TOP_UP })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`  ${name} (${address}): topped up to ${formatEther(TOP_UP)} ETH.`)
  }
}

main().catch((error) => {
  console.error(error.message ?? error)
  process.exit(1)
})
