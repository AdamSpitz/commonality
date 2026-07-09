// Recover the USDC that the spike left sitting in the counterfactual smart
// account, and send it to an arbitrary destination.
//
// The funds are inside a SimpleAccount (EntryPoint v0.7) that isn't deployed yet.
// SimpleAccount.execute() is callable by the *owner* directly (not only via a
// UserOp), so we don't need a bundler or paymaster. We just need the owner EOA
// to hold a little ETH on Base for gas, then:
//   1. deploy the account via the SimpleAccountFactory (owner pays gas), and
//   2. call execute(USDC, 0, transfer(dest, balance)) from the owner (owner pays gas).
//
// Usage:  node rescue-usdc.mjs 0xDESTINATION_ADDRESS
// (or set DEST=0x... in the env). Re-running is safe: factory createAccount is
// idempotent and the transfer just moves whatever USDC is present.

import { readFileSync } from 'node:fs'
import {
  createPublicClient, createWalletClient, http, erc20Abi, formatUnits, formatEther,
  encodeFunctionData, getAddress, isAddress,
} from 'viem'
import { base } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import { entryPoint07Address } from 'viem/account-abstraction'
import { toSimpleSmartAccount } from 'permissionless/accounts'

const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const dest = process.argv[2] || process.env.DEST
if (!dest || !isAddress(dest)) {
  console.error('Pass a destination address:  node rescue-usdc.mjs 0x...')
  process.exit(1)
}

const state = JSON.parse(readFileSync(new URL('./spike-state.json', import.meta.url), 'utf8'))
const owner = privateKeyToAccount(state.ownerPrivateKey)
const rpc = process.env.BASE_RPC_URL || 'https://mainnet.base.org'

const publicClient = createPublicClient({ chain: base, transport: http(rpc) })
const walletClient = createWalletClient({ account: owner, chain: base, transport: http(rpc) })

const account = await toSimpleSmartAccount({
  client: publicClient,
  owner,
  entryPoint: { address: entryPoint07Address, version: '0.7' },
})
const smart = getAddress(account.address)

const [usdcRaw, ownerEth, code] = await Promise.all([
  publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [smart] }),
  publicClient.getBalance({ address: owner.address }),
  publicClient.getCode({ address: smart }),
])

console.log('Owner EOA:     ', owner.address, `(${formatEther(ownerEth)} ETH)`)
console.log('Smart account: ', smart, code && code !== '0x' ? '(deployed)' : '(not deployed yet)')
console.log('USDC in account:', formatUnits(usdcRaw, 6))
console.log('Destination:   ', getAddress(dest))

if (usdcRaw === 0n) {
  console.log('\nNothing to move — USDC balance is 0.')
  process.exit(0)
}

// Need a little ETH on the OWNER EOA to pay Base gas (deploy + transfer ≈ well under $0.10).
if (ownerEth === 0n) {
  console.error(`\n⛔ The owner EOA has no ETH for gas. Fund it with a small amount of ETH on Base:`)
  console.error(`   ${owner.address}`)
  console.error(`   ~$1 of ETH is plenty. Send from any wallet, or do one more small Coinbase`)
  console.error(`   onramp buying ETH on Base to that address. Then re-run this script.`)
  process.exit(1)
}

// 1. Deploy the SimpleAccount if needed (idempotent factory call).
if (!code || code === '0x') {
  const { factory, factoryData } = await account.getFactoryArgs()
  console.log('\nDeploying smart account via factory', factory, '…')
  const h = await walletClient.sendTransaction({ to: factory, data: factoryData })
  console.log('  tx:', h)
  await publicClient.waitForTransactionReceipt({ hash: h })
  console.log('  deployed.')
}

// 2. From the owner, call SimpleAccount.execute(USDC, 0, transfer(dest, amount)).
const transferData = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [getAddress(dest), usdcRaw] })
const executeAbi = [{
  type: 'function', name: 'execute', stateMutability: 'nonpayable',
  inputs: [{ name: 'dest', type: 'address' }, { name: 'value', type: 'uint256' }, { name: 'func', type: 'bytes' }],
  outputs: [],
}]
console.log('\nTransferring', formatUnits(usdcRaw, 6), 'USDC →', getAddress(dest), '…')
const execHash = await walletClient.sendTransaction({
  to: smart,
  data: encodeFunctionData({ abi: executeAbi, functionName: 'execute', args: [USDC, 0n, transferData] }),
})
console.log('  tx:', execHash)
await publicClient.waitForTransactionReceipt({ hash: execHash })

const remaining = await publicClient.readContract({ address: USDC, abi: erc20Abi, functionName: 'balanceOf', args: [smart] })
console.log('\n✅ Done. Remaining USDC in account:', formatUnits(remaining, 6))
console.log('   Basescan:', `https://basescan.org/tx/${execHash}`)
