/**
 * On-chain reads via viem public client.
 *
 * Direct on-chain reads in addition to event-cache queries and IPFS fetching.
 *
 * These functions require a `publicClient` in the machinery.
 */

import {
  type Abi,
  type Address,
  type ContractFunctionName,
  type PublicClient,
  type ReadContractReturnType,
} from 'viem';
import { SDKMachinery } from '../machinery.js';
import { BeliefStates } from '../subsystems/conceptspace/types.js';
import type { Currency } from './currency.js';
import {
  AlignmentAttestationsAbi,
  AssuranceContractAbi,
  BeliefsAbi,
  DelegatableNotesAbi,
  ImplicationsAbi,
  MutableRefUpdaterAbi,
  ValueThresholdConditionAbi,
} from '../abis.js';
import { erc20MetadataAbi } from './erc20.js';

export const BELIEF_NO_OPINION = BigInt(BeliefStates.NO_OPINION);
export const BELIEF_BELIEVES = BigInt(BeliefStates.BELIEVES);
export const BELIEF_DISBELIEVES = BigInt(BeliefStates.DISBELIEVES);

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

/** Narrow untyped `PublicClient.readContract` using a const ABI. */
async function readView<
  const abi extends Abi,
  functionName extends ContractFunctionName<abi, 'pure' | 'view'>,
>(
  client: PublicClient,
  params: {
    address: Address;
    abi: abi;
    functionName: functionName;
    args?: readonly unknown[];
  },
): Promise<ReadContractReturnType<abi, functionName>> {
  return client.readContract(params as never) as Promise<ReadContractReturnType<abi, functionName>>;
}

/**
 * Read threshold and deadline from a ValueThresholdCondition.
 * Falls back to 0n if the contract does not implement those views.
 */
export async function readConditionParams(
  machinery: SDKMachinery,
  conditionAddress: Address,
): Promise<ConditionParams> {
  const client = requirePublicClient(machinery);

  try {
    const [threshold, deadline] = await Promise.all([
      readView(client, {
        address: conditionAddress,
        abi: ValueThresholdConditionAbi,
        functionName: 'threshold',
      }),
      readView(client, {
        address: conditionAddress,
        abi: ValueThresholdConditionAbi,
        functionName: 'deadline',
      }),
    ]);
    return { threshold, deadline };
  } catch {
    return { threshold: 0n, deadline: 0n };
  }
}

/** Read the ETH balance of a project (AssuranceContract). */
export async function readProjectETHBalance(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);
  return client.getBalance({ address: projectAddress });
}

/** ERC-20 symbol/decimals, or null if the token does not expose those views. */
export async function readERC20Currency(
  machinery: SDKMachinery,
  tokenAddress: Address,
): Promise<Currency | null> {
  const client = requirePublicClient(machinery);

  try {
    const [symbol, decimals] = await Promise.all([
      readView(client, {
        address: tokenAddress,
        abi: erc20MetadataAbi,
        functionName: 'symbol',
      }),
      readView(client, {
        address: tokenAddress,
        abi: erc20MetadataAbi,
        functionName: 'decimals',
      }),
    ]);

    return currencyForERC20(tokenAddress, symbol, Number(decimals));
  } catch {
    return null;
  }
}

/**
 * Assurance-contract ERC-20 settlement token and metadata, or null if the
 * views are missing. MVP projects always settle in ERC-20.
 */
export async function readProjectPaymentTokenInfo(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<ProjectPaymentTokenInfo | null> {
  const client = requirePublicClient(machinery);

  try {
    const tokenAddress = await readView(client, {
      address: projectAddress,
      abi: AssuranceContractAbi,
      functionName: 'paymentToken',
    });

    const currency = await readERC20Currency(machinery, tokenAddress);
    if (!currency) return null;

    return { tokenAddress, currency };
  } catch {
    return null;
  }
}

/**
 * Current DelegatableNotes slot (chainHash, amount, token). For delegation
 * chain and spent status, use foldNote on the event history.
 */
export async function readNoteOnChainInfo(
  machinery: SDKMachinery,
  noteContract: Address,
  noteId: bigint,
): Promise<NoteOnChainInfo | null> {
  const client = requirePublicClient(machinery);

  try {
    const result = await readView(client, {
      address: noteContract,
      abi: DelegatableNotesAbi,
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
 * Belief about a statement: 0 = no opinion, 1 = believes, 2 = disbelieves.
 * Returns 0 if unset or if the call fails.
 */
export async function readBelief(
  machinery: SDKMachinery,
  beliefsContract: Address,
  user: Address,
  statementId: `0x${string}`,
): Promise<BeliefState> {
  const client = requirePublicClient(machinery);

  try {
    const belief = await readView(client, {
      address: beliefsContract,
      abi: BeliefsAbi,
      functionName: 'getBelief',
      args: [user, statementId],
    });
    return BigInt(belief) as BeliefState;
  } catch {
    return BELIEF_NO_OPINION;
  }
}

/**
 * Whether an alignment attestation exists. False if missing or the call fails.
 * `subjectId` is bytes32; for address subjects use toSubjectId(address).
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
    return await readView(client, {
      address: attestationsContract,
      abi: AlignmentAttestationsAbi,
      functionName: 'hasAttestation',
      args: [attester, topicStatementId, subjectId, statementId],
    });
  } catch {
    return false;
  }
}

/** Whether an implication attestation exists. False if missing or the call fails. */
export async function readHasImplication(
  machinery: SDKMachinery,
  implicationsContract: Address,
  attester: Address,
  fromStatementCid: `0x${string}`,
  toStatementCid: `0x${string}`,
): Promise<boolean> {
  const client = requirePublicClient(machinery);

  try {
    return await readView(client, {
      address: implicationsContract,
      abi: ImplicationsAbi,
      functionName: 'hasAttestation',
      args: [attester, fromStatementCid, toStatementCid],
    });
  } catch {
    return false;
  }
}

/** Explanation CID for an implication, or null if missing/failed. */
export async function readExplanation(
  machinery: SDKMachinery,
  implicationsContract: Address,
  attester: Address,
  fromStatementCid: `0x${string}`,
  toStatementCid: `0x${string}`,
): Promise<`0x${string}` | null> {
  const client = requirePublicClient(machinery);

  try {
    return await readView(client, {
      address: implicationsContract,
      abi: ImplicationsAbi,
      functionName: 'getExplanation',
      args: [attester, fromStatementCid, toStatementCid],
    });
  } catch {
    return null;
  }
}

/** Current MutableRefUpdater value, or null if missing/failed. */
export async function readMutableRef(
  machinery: SDKMachinery,
  mutableRefUpdater: Address,
  owner: Address,
  name: string,
): Promise<string | null> {
  const client = requirePublicClient(machinery);

  try {
    return await readView(client, {
      address: mutableRefUpdater,
      abi: MutableRefUpdaterAbi,
      functionName: 'getRef',
      args: [owner, name],
    });
  } catch {
    return null;
  }
}

/** Cumulative funding from an AssuranceContract; 0n if the call fails. */
export async function readTotalReceivedValue(
  machinery: SDKMachinery,
  projectAddress: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);

  try {
    return await readView(client, {
      address: projectAddress,
      abi: AssuranceContractAbi,
      functionName: 'getAssuranceContractProgress',
    });
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
  return readView(client, {
    address: projectAddress,
    abi: AssuranceContractAbi,
    functionName: 'outstandingReimbursementTotal',
  });
}

/** Read the reimbursement currently available for one contributor. */
export async function readReimbursableAmount(
  machinery: SDKMachinery,
  projectAddress: Address,
  contributor: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);
  return readView(client, {
    address: projectAddress,
    abi: AssuranceContractAbi,
    functionName: 'reimbursableAmount',
    args: [contributor],
  });
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

    const contracts: Array<{
      address: Address;
      abi: Abi;
      functionName: string;
    }> = [];

    for (const project of projects) {
      requests.push({ kind: 'totalReceived', projectAddress: project.projectAddress });
      contracts.push({
        address: project.projectAddress,
        abi: AssuranceContractAbi,
        functionName: 'getAssuranceContractProgress',
      });

      if (project.conditionAddress) {
        requests.push({ kind: 'threshold', projectAddress: project.projectAddress });
        contracts.push({
          address: project.conditionAddress,
          abi: ValueThresholdConditionAbi,
          functionName: 'threshold',
        });

        requests.push({ kind: 'deadline', projectAddress: project.projectAddress });
        contracts.push({
          address: project.conditionAddress,
          abi: ValueThresholdConditionAbi,
          functionName: 'deadline',
        });
      }
    }

    const results = await client.multicall({
      allowFailure: true,
      contracts,
    } as never);

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

/** hasSucceeded/hasFailed from a ValueThresholdCondition. */
export async function readConditionStatus(
  machinery: SDKMachinery,
  conditionAddress: Address,
): Promise<ConditionStatus> {
  const client = requirePublicClient(machinery);

  try {
    const [hasSucceeded, hasFailed] = await Promise.all([
      readView(client, {
        address: conditionAddress,
        abi: ValueThresholdConditionAbi,
        functionName: 'hasSucceeded',
      }),
      readView(client, {
        address: conditionAddress,
        abi: ValueThresholdConditionAbi,
        functionName: 'hasFailed',
      }),
    ]);
    return { hasSucceeded, hasFailed };
  } catch {
    return { hasSucceeded: false, hasFailed: false };
  }
}

/** Next note ID on DelegatableNotes, or 0n if the call fails. */
export async function readNextNoteId(
  machinery: SDKMachinery,
  noteContract: Address,
): Promise<bigint> {
  const client = requirePublicClient(machinery);

  try {
    return await readView(client, {
      address: noteContract,
      abi: DelegatableNotesAbi,
      functionName: 'nextNoteId',
    });
  } catch {
    return 0n;
  }
}
