/**
 * User actions for Conceptspace subsystem
 */

import { type Address, type Hash } from 'viem';
import { cidToBytes32, type TestClients } from './common.js';

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
