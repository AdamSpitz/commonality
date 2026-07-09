// Step 3 of the spike — the actual answer.
//
// Reads the USDC balance of the counterfactual smart-account address on Base
// mainnet. If USDC shows up here after the Coinbase purchase, the go/no-go
// question is answered YES: Coinbase Onramp delivers USDC to an undeployed 4337
// address. Pass --watch to poll every 15s until it arrives.

import { readFileSync } from 'node:fs'
import { createPublicClient, http, erc20Abi, formatUnits } from 'viem'
import { base } from 'viem/chains'

// Canonical (native) USDC on Base mainnet.
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

const state = JSON.parse(readFileSync(new URL('./spike-state.json', import.meta.url), 'utf8'))
const address = state.smartAccountAddress

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
})

async function read() {
  const [raw, code] = await Promise.all([
    client.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [address] }),
    client.getCode({ address }),
  ])
  return { usdc: Number(formatUnits(raw, 6)), deployed: !!code && code !== '0x' }
}

const watch = process.argv.includes('--watch')

console.log('Smart account:', address)
console.log('Watching USDC on Base mainnet…', watch ? '(polling every 15s, Ctrl-C to stop)' : '')

do {
  const { usdc, deployed } = await read()
  const stamp = new Date().toLocaleTimeString()
  console.log(`[${stamp}] USDC: ${usdc}   (address deployed: ${deployed ? 'yes' : 'no — still counterfactual'})`)
  if (usdc > 0) {
    console.log('\n✅ GO — Coinbase Onramp delivered USDC to the counterfactual 4337 address.')
    console.log('   Basescan:', `https://basescan.org/address/${address}`)
    break
  }
  if (watch) await new Promise((r) => setTimeout(r, 15000))
} while (watch)
