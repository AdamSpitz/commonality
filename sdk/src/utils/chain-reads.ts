/**
 * On-chain reads via viem public client.
 *
 * Phase 2 of the indexer redesign: the SDK now has direct on-chain read capabilities
 * in addition to indexer (GraphQL) queries and IPFS fetching.
 *
 * These functions require a `publicClient` in the machinery.
 */

import { type Address, type PublicClient } from 'viem';
import { SDKMachinery } from '../machinery.js';

const EthThresholdConditionReadAbi = [
  {
    type: 'function',
    name: 'threshold',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'deadline',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const DelegatableNotesNotesAbi = [
  {
    type: 'function',
    name: 'notes',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'chainHash', type: 'bytes32' },
      { name: 'amount', type: 'uint256' },
      { name: 'token', type: 'address' },
      { name: 'tokenType', type: 'uint8' },
      { name: 'tokenId', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
] as const;

export interface ConditionParams {
  threshold: bigint;
  deadline: bigint;
}

export interface NoteOnChainInfo {
  chainHash: `0x${string}`;
  amount: bigint;
  token: Address;
  tokenType: number;
  tokenId: bigint;
}

function requirePublicClient(machinery: SDKMachinery): PublicClient {
  if (!machinery.publicClient) {
    throw new Error(
      'publicClient is required for on-chain reads. ' +
      'Pass a viem PublicClient when calling createSDKMachinery().',
    );
  }
  return machinery.publicClient;
}

/**
 * Read threshold and deadline from an EthThresholdCondition contract.
 *
 * Falls back to 0n values if the contract does not implement the
 * threshold/deadline view functions (non-EthThresholdCondition types).
 *
 * @param machinery SDK machinery with publicClient
 * @param conditionAddress Address of the condition contract
 */
export async function readConditionParams(
  machinery: SDKMachinery,
  conditionAddress: Address,
): Promise<ConditionParams> {
  const client = requirePublicClient(machinery);

  try {
    const [threshold, deadline] = await Promise.all([
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: conditionAddress,
        abi: EthThresholdConditionReadAbi,
        functionName: 'threshold',
      }),
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: conditionAddress,
        abi: EthThresholdConditionReadAbi,
        functionName: 'deadline',
      }),
    ]);
    return { threshold, deadline };
  } catch {
    return { threshold: 0n, deadline: 0n };
  }
}

/**
 * Read the ETH balance of a project (AssuranceContract).
 *
 * @param machinery SDK machinery with publicClient
 * @param projectAddress Address of the AssuranceContract
 */
export async function readProjectETHBalance(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);
  return client.getBalance({ address: projectAddress });
}

/**
 * Read basic on-chain info for a note from DelegatableNotes contract.
 *
 * Note: this returns only the current slot data (chainHash, amount, token info).
 * For full note state including delegation chain and spent status, use the
 * SDK's fold functions (foldNote) which process the full event history.
 *
 * @param machinery SDK machinery with publicClient
 * @param noteContract Address of the DelegatableNotes contract
 * @param noteId The numeric note ID
 */
export async function readNoteOnChainInfo(
  machinery: SDKMachinery,
  noteContract: Address,
  noteId: bigint,
): Promise<NoteOnChainInfo | null> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: noteContract,
      abi: DelegatableNotesNotesAbi,
      functionName: 'notes',
      args: [noteId],
    });
    return {
      chainHash: result[0],
      amount: result[1],
      token: result[2],
      tokenType: result[3],
      tokenId: result[4],
    };
  } catch {
    return null;
  }
}
