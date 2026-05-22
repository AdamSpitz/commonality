#!/usr/bin/env node
// Run once before testnet. Paste the output into your password manager.
// Never save this output to disk or share it.

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const roles = [
  { label: 'Deployer',            envKey: 'DEPLOYER_PRIVATE_KEY' },
  { label: 'ENS owner',           envKey: 'ENS_OWNER_PRIVATE_KEY' },
  { label: 'Implication attester',envKey: 'IMPLICATION_ATTESTER_PRIVATE_KEY' },
  { label: 'Content attester',    envKey: 'CONTENT_ATTESTER_PRIVATE_KEY' },
  { label: 'Channel verifier',    envKey: 'VERIFIER_PRIVATE_KEY' },
  { label: 'Nudger',              envKey: 'IMPLICATION_GRAPH_NUDGER_PRIVATE_KEY' },
  { label: 'Bridge creator',      envKey: 'BRIDGE_CREATOR_PRIVATE_KEY' },
  { label: 'Explorer curator',    envKey: 'EXPLORER_CURATOR_PRIVATE_KEY' },
]

console.log('=== Generated wallets — store these in your password manager ===\n')
for (const { label, envKey } of roles) {
  const privateKey = generatePrivateKey()
  const { address } = privateKeyToAccount(privateKey)
  console.log(`${label}`)
  console.log(`  ${envKey}=${privateKey}`)
  console.log(`  Address: ${address}`)
  console.log()
}
console.log('=== End of output ===')
console.log('Fund each address with Base Sepolia ETH before deploying.')
