import type { Abi } from 'viem';

export const ContentRegistryAbi: Abi = [
  {
    type: 'error',
    inputs: [
      { name: 'contentId', type: 'uint256' },
      { name: 'existingContract', type: 'address' },
    ],
    name: 'ContentAlreadyRegistered',
  },
  { type: 'error', inputs: [{ name: 'contentId', type: 'uint256' }], name: 'ContentNotRegistered' },
  { type: 'error', inputs: [], name: 'InvalidContentId' },
  {
    type: 'function',
    name: 'contentContract',
    inputs: [{ name: 'contentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'registerContent',
    inputs: [
      { name: 'contentId', type: 'uint256' },
      { name: 'assuranceContract', type: 'address' },
      { name: 'canonicalId', type: 'string' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'releaseContent',
    inputs: [{ name: 'contentId', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'isRegistered',
    inputs: [{ name: 'contentId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'ContentItemRegistered',
    inputs: [
      { name: 'contentId', type: 'uint256', indexed: true },
      { name: 'assuranceContract', type: 'address', indexed: true },
      { name: 'canonicalId', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ContentItemReleased',
    inputs: [{ name: 'contentId', type: 'uint256', indexed: true }],
  },
];