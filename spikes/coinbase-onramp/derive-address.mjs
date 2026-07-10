// Step 1 of the spike.
//
// Produce a *counterfactual* (not-yet-deployed) EIP-4337 smart-account address
// on Base mainnet, derived the same way production will: an owner EOA (the role
// Privy's embedded wallet plays as the 4337 signer) wrapped into a SimpleAccount
// via the SDK. Coinbase never sees the owner key — only the smart-account
// address — so a locally-generated owner is a faithful stand-in for a
// Privy-managed one for the purposes of THIS test. What we are probing is
// whether Coinbase will send USDC to an address whose code isn't deployed yet.
//
// Writes spike-state.json (owner key + derived address) so the other scripts,
// and re-runs, reuse the same address. Idempotent: won't overwrite existing state.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { entryPoint07Address } from 'viem/account-abstraction'
import { toSimpleSmartAccount } from 'permissionless/accounts'

const STATE = new URL('./spike-state.json', import.meta.url)

const client = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
})

let ownerPrivateKey
if (existsSync(STATE)) {
  const prev = JSON.parse(readFileSync(STATE, 'utf8'))
  ownerPrivateKey = prev.ownerPrivateKey
  console.log('Reusing owner key from existing spike-state.json')
} else {
  ownerPrivateKey = generatePrivateKey()
}

const owner = privateKeyToAccount(ownerPrivateKey)

const account = await toSimpleSmartAccount({
  client,
  owner,
  entryPoint: { address: entryPoint07Address, version: '0.7' },
})

const smartAccountAddress = account.address
const code = await client.getCode({ address: smartAccountAddress })
const deployed = !!code && code !== '0x'

writeFileSync(
  STATE,
  JSON.stringify(
    {
      note: 'Spike-only throwaway key. Do NOT reuse in production. Not gitignored by accident — see .gitignore.',
      chain: 'base-mainnet',
      ownerPrivateKey,
      ownerAddress: owner.address,
      smartAccountAddress,
      smartAccountType: 'SimpleAccount (EntryPoint v0.7)',
      createdAt: new Date().toISOString(),
    },
    null,
    2,
  ) + '\n',
)

console.log('\n=== Counterfactual 4337 smart account (Base mainnet) ===')
console.log('Owner EOA (Privy-signer stand-in):', owner.address)
console.log('Smart account address:            ', smartAccountAddress)
console.log('Deployed onchain yet?             ', deployed ? 'YES (already has code)' : 'NO — counterfactual, as intended')
console.log('\nWrote spike-state.json. Next: `npm run url`.')
if (deployed) {
  console.log('\n⚠  This address already has code. The spike specifically tests an')
  console.log('   UNDEPLOYED address. Delete spike-state.json and re-run to get a fresh one.')
}
