/**
 * User actions for Delegation subsystem
 */

import { type Address, type Hash, type Abi, parseEventLogs } from 'viem';
import { type TestClients } from '../../utils/ethereum.js';
import { DelegatableNotesAbi } from '../../abis.js';

// ============================================================================
// Delegation Actions
// ============================================================================

export interface DelegatableNotesContract {
  address: Address;
  abi: Abi;
}

export interface PurchaseShare {
  noteId: bigint;
  chain: Address[];
  shares: bigint;
}

export const TokenType = {
  ERC20: 0,
  ERC1155: 1,
} as const;

const erc20ApproveAbi = [
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
] as const;

async function extractCreatedNoteId(
  clients: TestClients,
  hash: Hash,
): Promise<{ hash: Hash; noteId: bigint }> {
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  const parsedLogs = parseEventLogs({
    abi: DelegatableNotesAbi,
    eventName: 'NoteCreated',
    logs: receipt.logs,
  });

  if (parsedLogs.length === 0) {
    throw new Error('Failed to find NoteCreated event in transaction logs');
  }

  return { hash, noteId: parsedLogs[0].args.noteId };
}

/**
 * Deposit ETH into a delegatable note
 *
 * Creates a new delegatable note funded with ETH. The note can later be delegated
 * to others or used to purchase from aligned projects.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Deposit parameters
 * @param params.amount - Amount of ETH to deposit (in wei)
 * @returns Transaction hash and the newly created noteId
 *
 * @example
 * ```typescript
 * const { noteId } = await depositETH(clients, contract, {
 *   amount: parseEther('1.0')
 * });
 * ```
 */
export async function depositETH(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    amount: bigint;
  }
): Promise<{ hash: Hash; noteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'deposit',
    args: [
      '0x0000000000000000000000000000000000000000', // address(0) for ETH
      TokenType.ERC20, // TokenType.ERC20 for ETH
      0n, // tokenId (unused for ETH)
      0n, // amount parameter (unused for ETH, use msg.value)
    ],
    value: params.amount,
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  return extractCreatedNoteId(clients, hash);
}

/**
 * Deposit ERC-20 payment tokens into a delegatable note.
 */
export async function depositERC20(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    token: Address;
    amount: bigint;
  }
): Promise<{ hash: Hash; noteId: bigint }> {
  const approvalHash = await clients.walletClient.writeContract({
    address: params.token,
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [delegatableNotesContract.address, params.amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });
  await clients.publicClient.waitForTransactionReceipt({ hash: approvalHash });

  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'deposit',
    args: [
      params.token,
      TokenType.ERC20,
      0n,
      params.amount,
    ],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  return extractCreatedNoteId(clients, hash);
}

/**
 * Delegate a note to another address
 *
 * Delegates all or part of a note's value to another address. If delegating a partial
 * amount, the note will be split into two: one for the delegate and one remainder note.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Delegation parameters
 * @param params.noteId - The ID of the note to delegate
 * @param params.owners - The delegation chain (leaf first, root last) that proves ownership
 * @param params.delegateTo - Address to delegate the note to
 * @param params.amount - Amount to delegate (can be partial or full note value)
 * @returns Transaction hash, the delegated note ID, and remainder note ID (0 if full delegation)
 *
 * @example
 * ```typescript
 * const { delegatedNoteId, remainderNoteId } = await delegateNote(clients, contract, {
 *   noteId: 1n,
 *   owners: [alice.address],
 *   delegateTo: bob.address,
 *   amount: parseEther('0.5')
 * });
 * ```
 */
export async function delegateNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    owners: Address[]; // Delegation chain (leaf first, root last)
    delegateTo: Address;
    amount: bigint;
  }
): Promise<{ hash: Hash; delegatedNoteId: bigint; remainderNoteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'delegate',
    args: [params.noteId, params.owners, params.delegateTo, params.amount],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });

  // Parse events to get the delegated note ID
  // The event could be a ChainSplit (partial delegation) or NoteDelegated (full delegation)
  let delegatedNoteId = params.noteId; // Default to same note for full delegation
  let remainderNoteId = 0n;

  // Look for ChainSplit event first (partial delegation)
  const chainSplitLogs = parseEventLogs({
    abi: DelegatableNotesAbi,
    eventName: 'ChainSplit',
    logs: receipt.logs,
  });

  if (chainSplitLogs.length > 0) {
    // Partial delegation occurred
    delegatedNoteId = chainSplitLogs[0].args.splitLeafId;
    remainderNoteId = chainSplitLogs[0].args.remainderLeafId;
  } else {
    // Full delegation - parse NoteDelegated event
    const noteDelegatedLogs = parseEventLogs({
      abi: DelegatableNotesAbi,
      eventName: 'NoteDelegated',
      logs: receipt.logs,
    });

    if (noteDelegatedLogs.length > 0) {
      delegatedNoteId = noteDelegatedLogs[0].args.childNoteId;
    }
  }

  return { hash, delegatedNoteId, remainderNoteId };
}

/**
 * Revoke a delegated note back to a position in the chain
 *
 * Revokes a delegation by calling this function from a parent position in the delegation
 * chain. This burns the delegated note and returns control to the revoker.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Revocation parameters
 * @param params.noteId - The ID of the note to revoke
 * @param params.owners - Current delegation chain (leaf first, root last)
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await revokeNote(clients, contract, {
 *   noteId: 2n,
 *   owners: [bob.address, alice.address]
 * });
 * ```
 */
export async function revokeNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    owners: Address[]; // Current delegation chain (leaf first, root last)
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'revoke',
    args: [params.noteId, params.owners],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Reclaim funds from a root note (non-delegated)
 *
 * Withdraws the funds from a note that hasn't been delegated. Only the original
 * depositor can reclaim funds from their root notes.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param noteId - The ID of the note to reclaim funds from
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await reclaimFunds(clients, contract, noteId);
 * ```
 */
export async function reclaimFunds(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  noteId: bigint
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'reclaimFunds',
    args: [noteId],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Purchase from primary market using delegatable notes
 *
 * Uses one or more delegatable notes to purchase tokens from a project's primary market
 * (assurance contract). The notes are consumed as payment and the delegation chain members
 * receive credit for the purchase.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Purchase parameters
 * @param params.purchaseShares - Per-note purchased-token shares; shares sum to count
 * @param params.primaryMarket - Address of the assurance contract
 * @param params.erc1155Contract - Address of the project's token contract
 * @param params.tokenId - Token ID to purchase
 * @param params.count - Quantity to purchase
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await purchaseFromPrimaryMarketWithNotes(clients, contract, {
 *   purchaseShares: [
 *     { noteId: 1n, chain: [alice.address], shares: 5n },
 *     { noteId: 2n, chain: [bob.address, alice.address], shares: 5n },
 *   ],
 *   primaryMarket: assuranceContract.address,
 *   erc1155Contract: tokenContract.address,
 *   tokenId: 0n,
 *   count: 10n
 * });
 * ```
 */
export async function purchaseFromPrimaryMarketWithNotes(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    purchaseShares: PurchaseShare[];
    primaryMarket: Address;
    erc1155Contract: Address;
    tokenId: bigint;
    count: bigint;
  }
): Promise<Hash> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'purchaseFromPrimaryMarket',
    args: [
      params.purchaseShares,
      params.primaryMarket,
      params.erc1155Contract,
      params.tokenId,
      params.count,
    ],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  await clients.publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Refund a receipt note from a failed assurance contract back into a note.
 *
 * The mirror image of {@link purchaseFromPrimaryMarketWithNotes}: where a purchase turns a
 * payment note into an ERC-1155 receipt note, a refund turns that receipt note back into a
 * settlement-token (ERC-20) note — but only once the assurance contract has entered its failed
 * state. The new note inherits the receipt note's delegation chain, so revocability is
 * preserved: a failed pledge replenishes the same revocable pool it was funded from instead of
 * stranding funds at an EOA. The whole note is refunded.
 *
 * @param clients - Test wallet and public clients for interacting with the blockchain
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param params - Refund parameters
 * @param params.noteId - The receipt note to refund (must be an ERC-1155 note)
 * @param params.chain - The note's delegation chain (leaf first, root last); chain[0] is the caller
 * @param params.primaryMarket - Address of the (failed) assurance contract that sold the receipts
 * @returns Transaction hash and the newly created settlement-token noteId
 *
 * @example
 * ```typescript
 * const { noteId } = await refundNote(clients, contract, {
 *   noteId: 5n,
 *   chain: [bob.address, alice.address],
 *   primaryMarket: assuranceContract.address,
 * });
 * ```
 */
export async function refundNote(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  params: {
    noteId: bigint;
    chain: Address[]; // Delegation chain (leaf first, root last)
    primaryMarket: Address;
  }
): Promise<{ hash: Hash; noteId: bigint }> {
  const hash = await clients.walletClient.writeContract({
    address: delegatableNotesContract.address,
    abi: delegatableNotesContract.abi,
    functionName: 'refundIntoNote',
    args: [params.noteId, params.chain, params.primaryMarket],
    chain: clients.walletClient.chain,
    account: clients.walletClient.account!,
  });

  return extractCreatedNoteId(clients, hash);
}

