#!/usr/bin/env node
/**
 * Local-only: every Hardhat dev account trusts every other one (score 100)
 * on TrustRegistry. After this, CauseStarter will load a non-empty trust
 * network for wallets connected via the local Hardhat picker.
 */
import { readFileSync } from 'node:fs'
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { hardhat } from 'viem/chains'

const PRIVATE_KEYS = [
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
]

const abi = parseAbi([
  'function setTrustBatch(address[] trustees, uint8[] scores)',
  'function getTrust(address truster, address trustee) view returns (uint8)',
])

function readTrustRegistryAddress() {
  const envPath = new URL('../deployments/localhost.env', import.meta.url)
  const text = readFileSync(envPath, 'utf8')
  const match = text.match(/^TRUST_REGISTRY_ADDRESS=(0x[a-fA-F0-9]{40})/m)
  if (!match) throw new Error('TRUST_REGISTRY_ADDRESS missing from deployments/localhost.env')
  return match[1]
}

async function main() {
  const rpcUrl = process.env.ETH_RPC_URL ?? 'http://127.0.0.1:8545'
  const registry = readTrustRegistryAddress()
  const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) })
  const accounts = PRIVATE_KEYS.map((key) => privateKeyToAccount(key))
  const addresses = accounts.map((account) => account.address)

  const alreadySeeded = await publicClient.readContract({
    address: registry,
    abi,
    functionName: 'getTrust',
    args: [addresses[0], addresses[1]],
  })
  if (alreadySeeded === 100) {
    console.log('Local Hardhat trust graph already present; skipping.')
    return
  }

  for (const account of accounts) {
    const trustees = addresses.filter((address) => address.toLowerCase() !== account.address.toLowerCase())
    const scores = trustees.map(() => 100)
    const walletClient = createWalletClient({
      account,
      chain: hardhat,
      transport: http(rpcUrl),
    })
    const hash = await walletClient.writeContract({
      address: registry,
      abi,
      functionName: 'setTrustBatch',
      args: [trustees, scores],
    })
    await publicClient.waitForTransactionReceipt({ hash })
    console.log(`Trusted ${trustees.length} wallets from ${account.address} (${hash})`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
