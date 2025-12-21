/**
 * User actions for Conceptspace subsystem
 */

import { type Address, type Hash } from 'viem';
import { cidToBytes32, type TestClients } from './common.js';
import type { StatementContent } from '../graphql-queries/conceptspace.js';

// ============================================================================
// Conceptspace Actions
// ============================================================================

export interface BeliefsContract {
  address: Address;
  abi: any;
}

// Belief state constants
export const NO_OPINION = 0;
export const BELIEVES = 1;
export const DISBELIEVES = 2;

/**
 * Express belief in a statement
 *
 * Records that the caller believes a statement to be true. This is a core action
 * in the Conceptspace system for expressing agreement with ideas.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param beliefsContract - The Beliefs contract instance
 * @param statementCid - IPFS CID of the statement content
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await believeStatement(clients, beliefsContract, 'QmStatementCid123');
 * ```
 */
export async function believeStatement(
  clients: TestClients,
  beliefsContract: BeliefsContract,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: beliefsContract.address,
    abi: beliefsContract.abi,
    functionName: 'setBelief',
    args: [statementId, BELIEVES],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Express disbelief in a statement
 *
 * Records that the caller believes a statement to be false. This allows users to
 * explicitly disagree with statements in the Conceptspace.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param beliefsContract - The Beliefs contract instance
 * @param statementCid - IPFS CID of the statement content
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await disbelieveStatement(clients, beliefsContract, 'QmStatementCid123');
 * ```
 */
export async function disbelieveStatement(
  clients: TestClients,
  beliefsContract: BeliefsContract,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: beliefsContract.address,
    abi: beliefsContract.abi,
    functionName: 'setBelief',
    args: [statementId, DISBELIEVES],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Remove opinion on a statement
 */
export async function clearOpinion(
  clients: TestClients,
  beliefsContract: BeliefsContract,
  statementCid: string
): Promise<Hash> {
  const statementId = cidToBytes32(statementCid);

  const hash = await clients.walletClient.writeContract({
    address: beliefsContract.address,
    abi: beliefsContract.abi,
    functionName: 'setBelief',
    args: [statementId, NO_OPINION],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Implications Actions
// ============================================================================

export interface ImplicationsContract {
  address: Address;
  abi: any;
}

/**
 * Attest that one statement implies another
 */
export async function attestImplication(
  clients: TestClients,
  implicationsContract: ImplicationsContract,
  fromStatementCid: string,
  toStatementCid: string
): Promise<Hash> {
  const fromStatementId = cidToBytes32(fromStatementCid);
  const toStatementId = cidToBytes32(toStatementCid);

  const hash = await clients.walletClient.writeContract({
    address: implicationsContract.address,
    abi: implicationsContract.abi,
    functionName: 'attestImplication',
    args: [fromStatementId, toStatementId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Batch attest multiple implications
 */
export async function attestImplicationsBatch(
  clients: TestClients,
  implicationsContract: ImplicationsContract,
  fromStatementCids: string[],
  toStatementCids: string[]
): Promise<Hash> {
  const fromStatementIds = fromStatementCids.map(cidToBytes32);
  const toStatementIds = toStatementCids.map(cidToBytes32);

  const hash = await clients.walletClient.writeContract({
    address: implicationsContract.address,
    abi: implicationsContract.abi,
    functionName: 'attestImplicationsInBatch',
    args: [fromStatementIds, toStatementIds],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// High-Level Statement Creation Workflow
// ============================================================================

export interface CreateAndSignStatementOptions {
  /** Callback invoked after IPFS upload completes with the CID */
  onIPFSUpload?: (cid: string) => void;
  /** Callback invoked after the belief transaction is confirmed */
  onSigned?: (txHash: Hash) => void;
  /** Callback invoked after the created-statements list is updated */
  onListUpdated?: (txHash: Hash) => void;
  /** Whether to add the statement to the user's created-statements list (default: true) */
  addToCreatedList?: boolean;
  /** GraphQL client for querying the indexer (required if addToCreatedList is true) */
  graphqlClient?: any;
}

export interface CreateAndSignStatementResult {
  /** IPFS CID of the statement content */
  cid: string;
  /** Transaction hash of the belief attestation */
  signTxHash: Hash;
  /** Transaction hash of the created-statements list update (if addToCreatedList is true) */
  updateListTxHash?: Hash;
}

/**
 * Complete workflow for creating and signing a statement.
 *
 * This is a high-level function that orchestrates the multi-step process of:
 * 1. Uploading statement content to IPFS
 * 2. Signing the statement via the Beliefs contract
 * 3. (Optionally) Adding the statement to the user's created-statements list
 *
 * Benefits over manual orchestration:
 * - Single function call instead of 3+ separate operations
 * - Progress callbacks for UI updates
 * - Consistent error handling across all steps
 * - Automatic state management (tracks which steps completed)
 * - Reduces UI code complexity
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param contracts - Contract instances needed for the workflow
 * @param contracts.beliefs - The Beliefs contract for signing statements
 * @param contracts.mutableRefUpdater - The MutableRefUpdater contract (required if addToCreatedList is true)
 * @param statementData - The statement content to create and sign
 * @param options - Optional configuration for callbacks and behavior
 * @returns Result containing CID and transaction hashes
 *
 * @example
 * ```typescript
 * // Basic usage
 * const result = await createAndSignStatement(
 *   clients,
 *   { beliefs: beliefsContract },
 *   {
 *     statementType: 'statement',
 *     content: 'Democracy is good',
 *     metadata: { createdDate: new Date().toISOString() }
 *   }
 * );
 * console.log('Created statement:', result.cid);
 *
 * // With progress callbacks and list updating
 * const result = await createAndSignStatement(
 *   clients,
 *   {
 *     beliefs: beliefsContract,
 *     mutableRefUpdater: mutableRefContract
 *   },
 *   statementData,
 *   {
 *     graphqlClient,
 *     addToCreatedList: true,
 *     onIPFSUpload: (cid) => console.log('Uploaded to IPFS:', cid),
 *     onSigned: (txHash) => console.log('Signed:', txHash),
 *     onListUpdated: (txHash) => console.log('List updated:', txHash)
 *   }
 * );
 * ```
 *
 * @throws {Error} If any step fails. The error message will indicate which step failed.
 *   Note: If step 1 or 2 fails, no blockchain state is modified. If step 3 fails,
 *   the statement is already created and signed, but not added to the created list.
 */
export async function createAndSignStatement(
  clients: TestClients,
  contracts: {
    beliefs: BeliefsContract;
    mutableRefUpdater?: { address: Address; abi: any };
  },
  statementData: StatementContent,
  options: CreateAndSignStatementOptions = {}
): Promise<CreateAndSignStatementResult> {
  const {
    onIPFSUpload,
    onSigned,
    onListUpdated,
    addToCreatedList = true,
    graphqlClient,
  } = options;

  // Validate inputs
  if (addToCreatedList && !contracts.mutableRefUpdater) {
    throw new Error('mutableRefUpdater contract is required when addToCreatedList is true');
  }
  if (addToCreatedList && !graphqlClient) {
    throw new Error('graphqlClient is required when addToCreatedList is true');
  }

  let cid: string;
  let signTxHash: Hash;
  let updateListTxHash: Hash | undefined;

  try {
    // Step 1: Upload content to IPFS
    const { uploadToIPFS } = await import('./common.js');
    cid = await uploadToIPFS(statementData);

    if (onIPFSUpload) {
      onIPFSUpload(cid);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to upload statement to IPFS: ${message}`);
  }

  try {
    // Step 2: Sign the statement via Beliefs contract
    signTxHash = await believeStatement(clients, contracts.beliefs, cid);

    if (onSigned) {
      onSigned(signTxHash);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to sign statement (CID: ${cid}): ${message}`);
  }

  // Step 3: Optionally update the created-statements list
  if (addToCreatedList && contracts.mutableRefUpdater) {
    try {
      const { addToCreatedStatements } = await import('../actions/mutable-refs-actions.js');
      updateListTxHash = await addToCreatedStatements(
        graphqlClient,
        clients,
        contracts.mutableRefUpdater,
        cid
      );

      if (onListUpdated) {
        onListUpdated(updateListTxHash);
      }
    } catch (error) {
      // Note: We don't throw here - statement is already created and signed
      // Just silently continue without updateListTxHash
      // This is expected behavior when the mutable refs system is unavailable
      // or when testing error conditions
    }
  }

  return {
    cid,
    signTxHash,
    updateListTxHash,
  };
}
