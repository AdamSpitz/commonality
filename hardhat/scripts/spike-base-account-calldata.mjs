// Run from the repo root:
//   set -a; source .env.secrets; set +a; node hardhat/scripts/spike-base-account-calldata.mjs
// (BASE_SEPOLIA_RPC_URL is optional; falls back to the public Base Sepolia RPC.)
//
// Phase 1 of specs/tech/wallet-without-privy-plan.md: local-owner Coinbase Smart Account
// (same account contract as Base Account). Answers EntryPoint version and execute calldata
// shape. Does not answer whether a real wallet honors our paymasterService URL.
import { createPublicClient, http, encodeFunctionData, parseAbi, slice, size } from 'viem'
import { baseSepolia } from 'viem/chains'
import { toCoinbaseSmartAccount } from 'viem/account-abstraction'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const RPC = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
const PROJECT = '0x00000000000000000000000000000000000000a1'
const SETTLEMENT = '0x35849b41e015fba6eba4002444c2984333b5de38'

const market = parseAbi([
  'function buyERC1155(address buyer,address erc1155Addr,uint256[] ids,uint256[] counts,bytes data)',
])
const erc20 = parseAbi(['function approve(address spender,uint256 amount)'])

const buyCall = encodeFunctionData({
  abi: market, functionName: 'buyERC1155',
  args: ['0x1111111111111111111111111111111111111111', PROJECT, [1n], [2n], '0x'],
})
const approveCall = encodeFunctionData({
  abi: erc20, functionName: 'approve', args: [PROJECT, 123n],
})

const EXECUTE = '0xb61d27f6' // execute(address,uint256,bytes)
const EXECUTE_BATCH = '0x34fcd5be' // executeBatch((address,uint256,bytes)[])

const client = createPublicClient({ chain: baseSepolia, transport: http(RPC) })
const owner = privateKeyToAccount(generatePrivateKey())

const account = await toCoinbaseSmartAccount({
  client,
  owners: [owner],
  version: '1.1',
})

console.log('smart-account address:', account.address)
console.log('entryPoint address   :', account.entryPoint.address)
console.log('entryPoint version   :', account.entryPoint.version)
console.log('factory address      :', account.factory.address)

function report(label, callData, expectSelector) {
  const selector = slice(callData, 0, 4)
  console.log(`\n=== ${label} ===`)
  console.log('callData length:', size(callData), 'bytes')
  console.log('selector:', selector, selector === expectSelector ? '✓ expected' : '✗ UNEXPECTED')
  console.log('callData:', callData)
  return selector
}

const single = await account.encodeCalls([{ to: PROJECT, value: 0n, data: buyCall }])
const singleSel = report('SINGLE  buyERC1155', single, EXECUTE)
if (singleSel === EXECUTE) {
  const decoded = await account.decodeCalls(single)
  console.log('decoded:', decoded)
}

const batch = await account.encodeCalls([
  { to: SETTLEMENT, value: 0n, data: approveCall },
  { to: PROJECT, value: 0n, data: buyCall },
])
const batchSel = report('BATCH   approve+buyERC1155', batch, EXECUTE_BATCH)
if (batchSel === EXECUTE_BATCH) {
  const decoded = await account.decodeCalls(batch)
  console.log('decoded calls:', decoded.length)
  for (const c of decoded) {
    console.log('  to:', c.to, 'value:', c.value, 'inner selector:', slice(c.data, 0, 4))
  }
}
