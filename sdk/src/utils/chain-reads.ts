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
  {
    type: 'function',
    name: 'hasSucceeded',
    inputs: [],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'hasFailed',
    inputs: [],
    outputs: [{ type: 'bool' }],
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
  {
    type: 'function',
    name: 'nextNoteId',
    inputs: [],
    outputs: [{ type: 'uint256' }],
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

const AlignmentAttestationsReadAbi = [
  {
    type: 'function',
    name: 'hasAttestation',
    inputs: [
      { name: 'attester', type: 'address' },
      { name: 'topicStatementId', type: 'bytes32' },
      { name: 'subjectAddress', type: 'address' },
      { name: 'statementId', type: 'bytes32' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

const ImplicationsReadAbi = [
  {
    type: 'function',
    name: 'hasAttestation',
    inputs: [
      { name: 'attester', type: 'address' },
      { name: 'fromStatementCid', type: 'bytes32' },
      { name: 'toStatementCid', type: 'bytes32' },
    ],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getExplanation',
    inputs: [
      { name: 'attester', type: 'address' },
      { name: 'fromStatementCid', type: 'bytes32' },
      { name: 'toStatementCid', type: 'bytes32' },
    ],
    outputs: [{ type: 'bytes32' }],
    stateMutability: 'view',
  },
] as const;

const MutableRefUpdaterReadAbi = [
  {
    type: 'function',
    name: 'getRef',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'name', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
    stateMutability: 'view',
  },
] as const;

const AssuranceContractReadAbi = [
  {
    type: 'function',
    name: 'getAssuranceContractProgress',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const ERC1155SecondaryMarketReadAbi = [
  {
    type: 'function',
    name: 'getSaleListing',
    inputs: [{ name: 'saleListingId', type: 'uint256' }],
    outputs: [
      { name: 'seller', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'count', type: 'uint256' },
      { name: 'pricePerToken', type: 'uint256' },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getBuyOrder',
    inputs: [{ name: 'buyOrderId', type: 'uint256' }],
    outputs: [
      { name: 'buyer', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'count', type: 'uint256' },
      { name: 'pricePerToken', type: 'uint256' },
    ],
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

export interface ConditionStatus {
  hasSucceeded: boolean;
  hasFailed: boolean;
}

export interface NoteOnChainInfo {
  chainHash: `0x${string}`;
  amount: bigint;
  token: Address;
  tokenType: number;
  tokenId: bigint;
}

export interface SaleListingInfo {
  seller: Address;
  tokenId: bigint;
  count: bigint;
  pricePerToken: bigint;
}

export interface BuyOrderInfo {
  buyer: Address;
  tokenId: bigint;
  count: bigint;
  pricePerToken: bigint;
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

/**
 * Read whether an alignment attestation exists.
 *
 * Returns false if no attestation exists or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param attestationsContract Address of the AlignmentAttestations contract
 * @param attester Address of the attester
 * @param topicStatementId IPFS CID (bytes32) of the topic statement
 * @param subjectAddress Address of the subject project
 * @param statementId IPFS CID (bytes32) of the alignment statement
 */
export async function readHasAlignment(
  machinery: SDKMachinery,
  attestationsContract: Address,
  attester: Address,
  topicStatementId: `0x${string}`,
  subjectAddress: Address,
  statementId: `0x${string}`,
): Promise<boolean> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: attestationsContract,
      abi: AlignmentAttestationsReadAbi,
      functionName: 'hasAttestation',
      args: [attester, topicStatementId, subjectAddress, statementId],
    });
    return result as unknown as boolean;
  } catch {
    return false;
  }
}

/**
 * Read whether an implication attestation exists.
 *
 * Returns false if no implication exists or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param implicationsContract Address of the Implications contract
 * @param attester Address of the attester
 * @param fromStatementCid IPFS CID (bytes32) of the source statement
 * @param toStatementCid IPFS CID (bytes32) of the target statement
 */
export async function readHasImplication(
  machinery: SDKMachinery,
  implicationsContract: Address,
  attester: Address,
  fromStatementCid: `0x${string}`,
  toStatementCid: `0x${string}`,
): Promise<boolean> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: implicationsContract,
      abi: ImplicationsReadAbi,
      functionName: 'hasAttestation',
      args: [attester, fromStatementCid, toStatementCid],
    });
    return result as unknown as boolean;
  } catch {
    return false;
  }
}

/**
 * Read the explanation CID for an implication attestation.
 *
 * Returns null if no explanation exists or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param implicationsContract Address of the Implications contract
 * @param attester Address of the attester
 * @param fromStatementCid IPFS CID (bytes32) of the source statement
 * @param toStatementCid IPFS CID (bytes32) of the target statement
 */
export async function readExplanation(
  machinery: SDKMachinery,
  implicationsContract: Address,
  attester: Address,
  fromStatementCid: `0x${string}`,
  toStatementCid: `0x${string}`,
): Promise<`0x${string}` | null> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: implicationsContract,
      abi: ImplicationsReadAbi,
      functionName: 'getExplanation',
      args: [attester, fromStatementCid, toStatementCid],
    });
    return result as `0x${string}`;
  } catch {
    return null;
  }
}

/**
 * Read the current ref value from a MutableRefUpdater contract.
 *
 * Returns null if the ref does not exist or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param mutableRefUpdater Address of the MutableRefUpdater contract
 * @param owner Address of the ref owner
 * @param name Name of the ref
 */
export async function readMutableRef(
  machinery: SDKMachinery,
  mutableRefUpdater: Address,
  owner: Address,
  name: string,
): Promise<string | null> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: mutableRefUpdater,
      abi: MutableRefUpdaterReadAbi,
      functionName: 'getRef',
      args: [owner, name],
    });
    return result as string;
  } catch {
    return null;
  }
}

/**
 * Read the total received value (cumulative funding) from an AssuranceContract.
 *
 * @param machinery SDK machinery with publicClient
 * @param projectAddress Address of the AssuranceContract
 */
export async function readTotalReceivedValue(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: projectAddress,
      abi: AssuranceContractReadAbi,
      functionName: 'getAssuranceContractProgress',
    });
    return result as bigint;
  } catch {
    return 0n;
  }
}

/**
 * Read the condition status (hasSucceeded/hasFailed) from an EthThresholdCondition contract.
 *
 * @param machinery SDK machinery with publicClient
 * @param conditionAddress Address of the condition contract
 */
export async function readConditionStatus(
  machinery: SDKMachinery,
  conditionAddress: Address,
): Promise<ConditionStatus> {
  const client = requirePublicClient(machinery);

  try {
    const [hasSucceeded, hasFailed] = await Promise.all([
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: conditionAddress,
        abi: EthThresholdConditionReadAbi,
        functionName: 'hasSucceeded',
      }),
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: conditionAddress,
        abi: EthThresholdConditionReadAbi,
        functionName: 'hasFailed',
      }),
    ]);
    return {
      hasSucceeded: hasSucceeded as unknown as boolean,
      hasFailed: hasFailed as unknown as boolean,
    };
  } catch {
    return { hasSucceeded: false, hasFailed: false };
  }
}

/**
 * Read a sale listing from the ERC1155SecondaryMarket contract.
 *
 * Returns null if the listing does not exist or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param marketAddress Address of the ERC1155SecondaryMarket contract
 * @param saleListingId The ID of the sale listing
 */
export async function readSaleListing(
  machinery: SDKMachinery,
  marketAddress: Address,
  saleListingId: bigint,
): Promise<SaleListingInfo | null> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: marketAddress,
      abi: ERC1155SecondaryMarketReadAbi,
      functionName: 'getSaleListing',
      args: [saleListingId],
    });
    return {
      seller: result[0],
      tokenId: result[1],
      count: result[2],
      pricePerToken: result[3],
    };
  } catch {
    return null;
  }
}

/**
 * Read a buy order from the ERC1155SecondaryMarket contract.
 *
 * Returns null if the order does not exist or if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param marketAddress Address of the ERC1155SecondaryMarket contract
 * @param buyOrderId The ID of the buy order
 */
export async function readBuyOrder(
  machinery: SDKMachinery,
  marketAddress: Address,
  buyOrderId: bigint,
): Promise<BuyOrderInfo | null> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: marketAddress,
      abi: ERC1155SecondaryMarketReadAbi,
      functionName: 'getBuyOrder',
      args: [buyOrderId],
    });
    return {
      buyer: result[0],
      tokenId: result[1],
      count: result[2],
      pricePerToken: result[3],
    };
  } catch {
    return null;
  }
}

/**
 * Read the next note ID counter from a DelegatableNotes contract.
 *
 * Returns 0n if the call fails.
 *
 * @param machinery SDK machinery with publicClient
 * @param noteContract Address of the DelegatableNotes contract
 */
export async function readNextNoteId(
  machinery: SDKMachinery,
  noteContract: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: noteContract,
      abi: DelegatableNotesNotesAbi,
      functionName: 'nextNoteId',
    });
    return result as bigint;
  } catch {
    return 0n;
  }
}
