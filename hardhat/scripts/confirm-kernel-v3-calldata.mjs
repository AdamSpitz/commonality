// Run from the repo root:
//   set -a; source .env.secrets; set +a; node hardhat/scripts/confirm-kernel-v3-calldata.mjs
// (BASE_SEPOLIA_RPC_URL is optional; falls back to the public Base Sepolia RPC.)
//
// Confirms the Kernel v3 (ERC-7579) execute calldata shape that Privy+Pimlico produce,
// using the same permissionless `toEcdsaKernelSmartAccount` helper Privy wraps under the hood.
// We only need the deterministic callData (account.encodeCalls), not an on-chain send.
import { createPublicClient, http, encodeFunctionData, parseAbi, slice, size } from 'viem'
import { baseSepolia } from 'viem/chains'
import { entryPoint07Address } from 'viem/account-abstraction'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { toEcdsaKernelSmartAccount } from 'permissionless/accounts'

const RPC = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'
const PROJECT = '0x00000000000000000000000000000000000000a1' // stand-in enrolled project (lowercase, no checksum)
const SETTLEMENT = '0x35849b41e015fba6eba4002444c2984333b5de38' // USDZZZ payment token (base-sepolia), lowercased

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

const client = createPublicClient({ chain: baseSepolia, transport: http(RPC) })
const owner = privateKeyToAccount(generatePrivateKey())

const account = await toEcdsaKernelSmartAccount({
  client,
  owners: [owner],
  entryPoint: { address: entryPoint07Address, version: '0.7' },
  version: '0.3.1',
})

console.log('smart-account address:', account.address)

// ---- The decoder's expectations (mirror CreatorGasTank.sol) ----
const KERNEL_V3_EXECUTE = '0xe9ae5c53' // execute(bytes32,bytes)

function report(label, callData) {
  const selector = slice(callData, 0, 4)
  console.log(`\n=== ${label} ===`)
  console.log('callData length:', size(callData), 'bytes')
  console.log('selector:', selector, selector === KERNEL_V3_EXECUTE ? '✓ matches decoder KERNEL_V3_EXECUTE_SELECTOR' : '✗ UNEXPECTED')
  // decode execute(bytes32 mode, bytes executionCalldata)
  const mode = slice(callData, 4, 36)
  const callType = slice(mode, 0, 1)
  console.log('execMode:', mode)
  console.log('callType byte:', callType, callType === '0x00' ? '(single)' : callType === '0x01' ? '(batch)' : '(other)')
  return { selector, callType }
}

// Single: buyERC1155
const single = await account.encodeCalls([{ to: PROJECT, value: 0n, data: buyCall }])
const s = report('SINGLE  buyERC1155', single)
if (s.callType === '0x00') {
  // executionCalldata is abi-encoded (bytes32 offset,len,data); the inner packed exec is target||value||callData
  // decode the outer bytes arg then verify packed layout
  const execData = decodeOuterBytes(single)
  const target = slice(execData, 0, 20)
  const value = slice(execData, 20, 52)
  const inner = slice(execData, 52)
  console.log('packed target:', target, target.toLowerCase() === PROJECT.toLowerCase() ? '✓' : '✗')
  console.log('packed value :', value)
  console.log('inner selector:', slice(inner, 0, 4), slice(inner, 0, 4) === slice(buyCall, 0, 4) ? '✓ buyERC1155' : '✗')
}

// Batch: approve + buy
const batch = await account.encodeCalls([
  { to: SETTLEMENT, value: 0n, data: approveCall },
  { to: PROJECT, value: 0n, data: buyCall },
])
report('BATCH   approve+buyERC1155', batch)

// Helper: pull the second ABI arg (bytes executionCalldata) out of execute(bytes32,bytes) calldata
function decodeOuterBytes(callData) {
  const args = slice(callData, 4) // strip selector
  const offset = BigInt(slice(args, 32, 64)) // second head word = offset to bytes
  const lenPos = Number(offset)
  const len = Number(BigInt(slice(args, lenPos, lenPos + 32)))
  return slice(args, lenPos + 32, lenPos + 32 + len)
}
