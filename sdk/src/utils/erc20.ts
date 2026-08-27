import type { Address, Hash } from 'viem';
import type { WriteClients } from './ethereum.js';

/** ERC-20 display metadata views. Not a Commonality contract ABI. */
export const erc20MetadataAbi = [
  {
    type: 'function',
    name: 'symbol',
    inputs: [],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export const erc20ApproveAbi = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export async function approveERC20Spend(
  clients: WriteClients,
  token: Address,
  spender: Address,
  amount: bigint,
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: token,
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [spender, amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
