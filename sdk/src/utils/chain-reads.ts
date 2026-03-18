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

const BeliefsReadAbi = [
  {
    type: 'function',
    name: 'getBelief',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'statementId', type: 'bytes32' },
    ],
    outputs: [{ type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export const BELIEF_NO_OPINION = 0n;
export const BELIEF_BELIEVES = 1n;
export const BELIEF_DISBELIEVES = 2n;

export type BeliefState = typeof BELIEF_NO_OPINION | typeof BELIEF_BELIEVES | typeof BELIEF_DISBELIEVES;

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

/**
 * Read a user's belief about a statement from the Beliefs contract.
 *
 * Belief states: 0 = no opinion, 1 = believes, 2 = disbelieves.
 * Returns 0 (no opinion) if the user has not expressed a belief or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param beliefsContract Address of the Beliefs contract
 * @param user Address of the user
 * @param statementId IPFS CID (bytes32) of the statement
 */
export async function readBelief(
  machinery: SDKMachinery,
  beliefsContract: Address,
  user: Address,
  statementId: `0x${string}`,
): Promise<BeliefState> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const belief = await client.readContract({
      address: beliefsContract,
      abi: BeliefsReadAbi,
      functionName: 'getBelief',
      args: [user, statementId],
    });
    return belief as unknown as BeliefState;
  } catch {
    return BELIEF_NO_OPINION;
  }
}
