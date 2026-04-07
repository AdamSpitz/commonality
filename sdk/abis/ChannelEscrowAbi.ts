import type { Abi } from 'viem';

export const ChannelEscrowAbi: Abi = [
  { type: 'error', inputs: [], name: 'OnlyChannelOwnerCanWithdraw' },
  { type: 'error', inputs: [], name: 'InvalidRegistryAddress' },
  { type: 'error', inputs: [], name: 'MustSendEth' },
  { type: 'error', inputs: [], name: 'ChannelNotVerified' },
  { type: 'error', inputs: [], name: 'OnlyChannelOwner' },
  { type: 'error', inputs: [], name: 'NoBalance' },
  { type: 'error', inputs: [], name: 'TransferFailed' },
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: 'channelId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'withdraw',
    inputs: [{ name: 'channelId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balance',
    inputs: [{ name: 'channelId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'channelId', type: 'bytes32', indexed: true },
      { name: 'from', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'channelId', type: 'bytes32', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
];