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
import type { Currency } from './currency.js';

const ValueThresholdConditionReadAbi = [
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
      { name: 'subjectId', type: 'bytes32' },
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
  {
    type: 'function',
    name: 'paymentToken',
    inputs: [],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'outstandingReimbursementTotal',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'reimbursableAmount',
    inputs: [{ name: 'contributor', type: 'address' }],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

const ERC20MetadataReadAbi = [
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

export interface ProjectFundingSnapshot {
  projectAddress: Address;
  totalReceived: bigint;
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

export interface ProjectPaymentTokenInfo {
  tokenAddress: Address;
  currency: Currency;
}

function currencyForERC20(tokenAddress: Address, symbol: string, decimals: number): Currency {
  return {
    kind: 'erc20',
    symbol,
    decimals,
    tokenAddress,
    tokenType: 0,
  };
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
 * Read threshold and deadline from an ValueThresholdCondition contract.
 *
 * Falls back to 0n values if the contract does not implement the
 * threshold/deadline view functions (non-ValueThresholdCondition types).
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
        abi: ValueThresholdConditionReadAbi,
        functionName: 'threshold',
      }),
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: conditionAddress,
        abi: ValueThresholdConditionReadAbi,
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
 * Read ERC-20 token display metadata.
 *
 * Returns null if the token does not expose the standard ERC-20 metadata views.
 */
export async function readERC20Currency(
  machinery: SDKMachinery,
  tokenAddress: Address,
): Promise<Currency | null> {
  const client = requirePublicClient(machinery);

  try {
    const [symbol, decimals] = await Promise.all([
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: tokenAddress,
        abi: ERC20MetadataReadAbi,
        functionName: 'symbol',
      }),
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: tokenAddress,
        abi: ERC20MetadataReadAbi,
        functionName: 'decimals',
      }),
    ]);

    return currencyForERC20(tokenAddress, symbol as string, Number(decimals));
  } catch {
    return null;
  }
}

/**
 * Read an assurance contract's ERC-20 settlement token and metadata.
 *
 * Returns null if the project contract or token does not expose the expected
 * views. MVP assurance contracts always settle in ERC-20 tokens, so callers can
 * use this to avoid hardcoding ETH in UI display.
 */
export async function readProjectPaymentTokenInfo(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<ProjectPaymentTokenInfo | null> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const tokenAddress = await client.readContract({
      address: projectAddress,
      abi: AssuranceContractReadAbi,
      functionName: 'paymentToken',
    }) as Address;

    const currency = await readERC20Currency(machinery, tokenAddress);
    if (!currency) return null;

    return { tokenAddress, currency };
  } catch {
    return null;
  }
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
 * @param subjectId bytes32 subject identifier. For address subjects, use toSubjectId(address).
 * @param statementId IPFS CID (bytes32) of the alignment statement
 */
export async function readHasAlignment(
  machinery: SDKMachinery,
  attestationsContract: Address,
  attester: Address,
  topicStatementId: `0x${string}`,
  subjectId: `0x${string}`,
  statementId: `0x${string}`,
): Promise<boolean> {
  const client = requirePublicClient(machinery);

  try {
    // @ts-expect-error - viem type inference issue with generic Abi
    const result = await client.readContract({
      address: attestationsContract,
      abi: AlignmentAttestationsReadAbi,
      functionName: 'hasAttestation',
      args: [attester, topicStatementId, subjectId, statementId],
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

/** Read how much of a project's early contributions remains unreimbursed. */
export async function readOutstandingReimbursementTotal(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);
  // @ts-expect-error - viem type inference issue with generic PublicClient
  const result = await client.readContract({
    address: projectAddress,
    abi: AssuranceContractReadAbi,
    functionName: 'outstandingReimbursementTotal',
  });
  return result as bigint;
}

/** Read the reimbursement currently available for one contributor. */
export async function readReimbursableAmount(
  machinery: SDKMachinery,
  projectAddress: Address,
  contributor: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);
  // @ts-expect-error - viem type inference issue with generic PublicClient
  const result = await client.readContract({
    address: projectAddress,
    abi: AssuranceContractReadAbi,
    functionName: 'reimbursableAmount',
    args: [contributor],
  });
  return result as bigint;
}

/**
 * Read totalReceived/threshold/deadline for many projects in one multicall.
 *
 * Projects without a condition address get 0n threshold/deadline values.
 * Failed calls are treated as zero values so callers can still render partial data.
 */
export async function readProjectFundingSnapshots(
  machinery: SDKMachinery,
  projects: Array<{ projectAddress: Address; conditionAddress: Address | null }>,
): Promise<ProjectFundingSnapshot[]> {
  if (projects.length === 0) return [];

  const client = requirePublicClient(machinery);
  try {
    const requests: Array<
      | { kind: 'totalReceived'; projectAddress: Address }
      | { kind: 'threshold'; projectAddress: Address }
      | { kind: 'deadline'; projectAddress: Address }
    > = [];

    const contracts = [];

    for (const project of projects) {
      requests.push({ kind: 'totalReceived', projectAddress: project.projectAddress });
      contracts.push({
        address: project.projectAddress,
        abi: AssuranceContractReadAbi,
        functionName: 'getAssuranceContractProgress',
      });

      if (project.conditionAddress) {
        requests.push({ kind: 'threshold', projectAddress: project.projectAddress });
        contracts.push({
          address: project.conditionAddress,
          abi: ValueThresholdConditionReadAbi,
          functionName: 'threshold',
        });

        requests.push({ kind: 'deadline', projectAddress: project.projectAddress });
        contracts.push({
          address: project.conditionAddress,
          abi: ValueThresholdConditionReadAbi,
          functionName: 'deadline',
        });
      }
    }

    // @ts-expect-error - viem type inference struggles with mixed ABI multicalls
    const results = await client.multicall({ allowFailure: true, contracts });

    const snapshots = new Map<string, ProjectFundingSnapshot>();
    for (const project of projects) {
      snapshots.set(project.projectAddress.toLowerCase(), {
        projectAddress: project.projectAddress,
        totalReceived: 0n,
        threshold: 0n,
        deadline: 0n,
      });
    }

    results.forEach((result, index) => {
      const request = requests[index];
      const snapshot = snapshots.get(request.projectAddress.toLowerCase());
      if (!snapshot || result.status !== 'success') return;

      const value = result.result as bigint;
      if (request.kind === 'totalReceived') snapshot.totalReceived = value;
      if (request.kind === 'threshold') snapshot.threshold = value;
      if (request.kind === 'deadline') snapshot.deadline = value;
    });

    return projects
      .map((project) => snapshots.get(project.projectAddress.toLowerCase()))
      .filter((snapshot): snapshot is ProjectFundingSnapshot => snapshot !== undefined);
  } catch {
    return Promise.all(
      projects.map(async (project) => {
        const totalReceived = await readTotalReceivedValue(machinery, project.projectAddress);
        const params = project.conditionAddress
          ? await readConditionParams(machinery, project.conditionAddress)
          : { threshold: 0n, deadline: 0n };

        return {
          projectAddress: project.projectAddress,
          totalReceived,
          threshold: params.threshold,
          deadline: params.deadline,
        };
      }),
    );
  }
}

/**
 * Read the condition status (hasSucceeded/hasFailed) from an ValueThresholdCondition contract.
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
        abi: ValueThresholdConditionReadAbi,
        functionName: 'hasSucceeded',
      }),
      // @ts-expect-error - viem type inference issue with generic Abi
      client.readContract({
        address: conditionAddress,
        abi: ValueThresholdConditionReadAbi,
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
