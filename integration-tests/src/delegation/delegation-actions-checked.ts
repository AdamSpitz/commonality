/**
 * Checked versions of delegation actions
 *
 * These wrapper functions execute delegation actions and automatically verify
 * state transition properties and invariants.
 *
 * Usage:
 *   // Instead of:
 *   await delegateNote(clients, contract, params);
 *   await assertDelegationChainIntegrity(machinery, noteId);
 *
 *   // Write:
 *   await delegateNoteChecked(clients, contract, machinery, params);
 */

import type { Hash, Address } from 'viem';
import {
  depositETH,
  depositERC20,
  delegateNote,
  revokeNote,
  reclaimFunds,
  purchaseFromPrimaryMarketWithNotes,
  waitForIndexerToSyncToTxHash,
  type TestClients,
  type DelegatableNotesContract,
} from '@commonality/sdk';
import {
  ActionTestingMachinery,
  runActionAndCheckProperties,
  type ActionContext,
  type ActionRunOptions,
} from '../actions/action-framework.js';
import {
  depositETHMetadata,
  delegateNoteMetadata,
  revokeNoteMetadata,
  reclaimFundsMetadata,
  spendDelegatedNoteMetadata,
} from './delegation-action-properties.js';

/**
 * Create a delegatable note by depositing ETH (with property checking)
 *
 * This wrapper runs the depositETH action and automatically:
 * 1. Verifies the delegation chain integrity for the new note
 *
 * @param clients - Test wallet and public clients
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param machinery - Action testing machinery
 * @param params - Deposit parameters
 * @param params.amount - Amount of ETH to deposit (in wei)
 * @param options - Optional: control which checks run
 * @returns Object containing transaction hash and the newly created noteId
 *
 * @example
 * ```typescript
 * const { noteId } = await depositETHChecked(
 *   clients,
 *   delegatableNotesContract,
 *   machinery,
 *   {
 *     amount: parseEther('1.0')
 *   }
 * );
 * // Delegation chain integrity is automatically verified
 * ```
 */
export async function depositETHChecked(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  machinery: ActionTestingMachinery,
  params: {
    amount: bigint;
  },
  options?: ActionRunOptions
): Promise<{ hash: Hash; noteId: bigint }> {
  // Context that will be populated during action execution
  const context: ActionContext = {
    machinery,
    contracts: { delegation: delegatableNotesContract },
    entities: {
      delegationNoteId: '', // Will be set after action completes
      userAddress: clients.account,
    },
  };

  // Execute action and wait for sync before invariant checks
  const result = await runActionAndCheckProperties(
    async () => {
      const actionResult = await depositETH(clients, delegatableNotesContract, params);

      // Wait for indexer to sync
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, actionResult.hash);

      // Update context with the note ID for invariant checking
      context.entities.delegationNoteId = actionResult.noteId.toString();

      return actionResult;
    },
    depositETHMetadata,
    context,
    options
  );

  return result;
}

export async function depositPaymentTokenChecked(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  machinery: ActionTestingMachinery,
  params: {
    amount: bigint;
  },
  options?: ActionRunOptions
): Promise<{ hash: Hash; noteId: bigint }> {
  const paymentToken = process.env.PAYMENT_TOKEN_ADDRESS as Address | undefined;

  if (!paymentToken) {
    throw new Error('PAYMENT_TOKEN_ADDRESS is required for depositPaymentTokenChecked');
  }

  const context: ActionContext = {
    machinery,
    contracts: { delegation: delegatableNotesContract },
    entities: {
      delegationNoteId: '',
      userAddress: clients.account,
    },
  };

  const result = await runActionAndCheckProperties(
    async () => {
      const actionResult = await depositERC20(clients, delegatableNotesContract, {
        token: paymentToken,
        amount: params.amount,
      });

      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, actionResult.hash);
      context.entities.delegationNoteId = actionResult.noteId.toString();

      return actionResult;
    },
    depositETHMetadata,
    context,
    options
  );

  return result;
}

/**
 * Delegate a note to another address (with property checking)
 *
 * This wrapper runs the delegateNote action and automatically:
 * 1. Verifies the delegation chain grows correctly
 * 2. Verifies the new owner is set correctly
 * 3. Verifies delegation chain integrity
 *
 * @param clients - Test wallet and public clients
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param machinery - Action testing machinery
 * @param params - Delegation parameters
 * @param params.noteId - The ID of the note to delegate
 * @param params.owners - The delegation chain (leaf first, root last) that proves ownership
 * @param params.delegateTo - Address to delegate the note to
 * @param params.amount - Amount to delegate (can be partial or full note value)
 * @param options - Optional: control which checks run
 * @returns Object containing transaction hash, delegated note ID, and remainder note ID
 *
 * @example
 * ```typescript
 * const { delegatedNoteId } = await delegateNoteChecked(
 *   clients,
 *   delegatableNotesContract,
 *   machinery,
 *   {
 *     noteId: 1n,
 *     owners: [alice.address],
 *     delegateTo: bob.address,
 *     amount: parseEther('0.5')
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function delegateNoteChecked(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  machinery: ActionTestingMachinery,
  params: {
    noteId: bigint;
    owners: Address[];
    delegateTo: Address;
    amount: bigint;
  },
  options?: ActionRunOptions
): Promise<{ hash: Hash; delegatedNoteId: bigint; remainderNoteId: bigint }> {
  const context: ActionContext = {
    machinery,
    contracts: { delegation: delegatableNotesContract },
    entities: {
      delegationNoteId: params.noteId.toString(),
      userAddress: clients.account,
    },
    extra: {
      delegateTo: params.delegateTo,
    },
  };

  const result = await runActionAndCheckProperties(
    async () => {
      const actionResult = await delegateNote(clients, delegatableNotesContract, params);

      // Wait for indexer to sync
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, actionResult.hash);

      // Update context with the delegated note ID for invariant checking
      context.entities.delegationNoteId = actionResult.delegatedNoteId.toString();

      return actionResult;
    },
    delegateNoteMetadata,
    context,
    options
  );

  return result;
}

/**
 * Revoke a delegated note (with property checking)
 *
 * This wrapper runs the revokeNote action and automatically:
 * 1. Verifies the note is marked as revoked
 * 2. Verifies delegation chain integrity is maintained
 *
 * @param clients - Test wallet and public clients
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param machinery - Action testing machinery
 * @param params - Revocation parameters
 * @param params.noteId - The ID of the note to revoke
 * @param params.owners - Current delegation chain (leaf first, root last)
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await revokeNoteChecked(
 *   clients,
 *   delegatableNotesContract,
 *   machinery,
 *   {
 *     noteId: 2n,
 *     owners: [bob.address, alice.address]
 *   }
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function revokeNoteChecked(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  machinery: ActionTestingMachinery,
  params: {
    noteId: bigint;
    owners: Address[];
  },
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    machinery,
    contracts: { delegation: delegatableNotesContract },
    entities: {
      delegationNoteId: params.noteId.toString(),
      userAddress: clients.account,
    },
  };

  const result = await runActionAndCheckProperties(
    async () => {
      const hash = await revokeNote(clients, delegatableNotesContract, params);

      // Wait for indexer to sync
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);

      return hash;
    },
    revokeNoteMetadata,
    context,
    options
  );

  return result;
}

/**
 * Purchase from primary market using delegated notes (with property checking)
 *
 * This wrapper runs the purchaseFromPrimaryMarketWithNotes action and automatically:
 * 1. Verifies delegation chain integrity for all notes being spent
 *
 * Note: This function checks delegation chain integrity for each note used in the purchase.
 * For funding-related properties (money conservation, token conservation), use the
 * funding action wrappers instead.
 *
 * @param clients - Test wallet and public clients
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param machinery - Action testing machinery
 * @param params - Purchase parameters
 * @param params.noteIds - IDs of notes to use for payment
 * @param params.chains - Delegation chains for each note (leaf first, root last)
 * @param params.paymentAmount - Total amount to pay
 * @param params.primaryMarket - Address of the assurance contract
 * @param params.erc1155Contract - Address of the project's token contract
 * @param params.tokenIds - Token IDs to purchase
 * @param params.counts - Quantities for each token ID
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * await spendDelegatedNoteChecked(
 *   clients,
 *   delegatableNotesContract,
 *   machinery,
 *   {
 *     noteIds: [1n, 2n],
 *     chains: [[alice.address], [bob.address, alice.address]],
 *     paymentAmount: parseEther('1.0'),
 *     primaryMarket: assuranceContract.address,
 *     erc1155Contract: tokenContract.address,
 *     tokenIds: [0n],
 *     counts: [10n]
 *   }
 * );
 * // Delegation chain integrity is automatically verified for all notes
 * ```
 */
export async function spendDelegatedNoteChecked(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  machinery: ActionTestingMachinery,
  params: {
    noteIds: bigint[];
    chains: Address[][];
    paymentAmount: bigint;
    primaryMarket: Address;
    erc1155Contract: Address;
    tokenIds: bigint[];
    counts: bigint[];
  },
  options?: ActionRunOptions
): Promise<Hash> {
  const result = await runActionAndCheckProperties(
    async () => {
      if (params.tokenIds.length !== 1 || params.counts.length !== 1) {
        throw new Error('Delegatable-note purchases support one token type per transaction');
      }
      const hash = await purchaseFromPrimaryMarketWithNotes(clients, delegatableNotesContract, {
        purchaseShares: params.noteIds.map((noteId, index) => ({
          noteId,
          chain: params.chains[index],
          shares: index === 0 ? params.counts[0] : 0n,
        })).filter(share => share.shares > 0n),
        primaryMarket: params.primaryMarket,
        erc1155Contract: params.erc1155Contract,
        tokenId: params.tokenIds[0],
        count: params.counts[0],
      });

      // Wait for indexer to sync
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);

      return hash;
    },
    spendDelegatedNoteMetadata,
    // For spending, we check each note's chain integrity
    // We use the first note as the primary entity for context
    {
      machinery,
      contracts: { delegation: delegatableNotesContract },
      entities: {
        delegationNoteId: params.noteIds[0]?.toString(),
        userAddress: clients.account,
      },
      extra: {
        allNoteIds: params.noteIds.map(id => id.toString()),
      },
    },
    options
  );

  return result;
}

/**
 * Reclaim funds from a delegatable note (with property checking)
 *
 * This wrapper runs the reclaimFunds action and automatically:
 * 1. Verifies the note becomes inactive
 * 2. Verifies the note amount becomes 0
 * 3. Verifies delegation chain integrity
 *
 * @param clients - Test wallet and public clients
 * @param delegatableNotesContract - The DelegatableNotes contract instance
 * @param machinery - Action testing machinery
 * @param noteId - The ID of the note to reclaim
 * @param options - Optional: control which checks run
 * @returns Transaction hash
 *
 * @example
 * ```typescript
 * const txHash = await reclaimFundsChecked(
 *   clients,
 *   delegatableNotesContract,
 *   machinery,
 *   noteId
 * );
 * // State transition properties and invariants are automatically verified
 * ```
 */
export async function reclaimFundsChecked(
  clients: TestClients,
  delegatableNotesContract: DelegatableNotesContract,
  machinery: ActionTestingMachinery,
  noteId: bigint,
  options?: ActionRunOptions
): Promise<Hash> {
  const context: ActionContext = {
    machinery,
    contracts: { delegation: delegatableNotesContract },
    entities: {
      delegationNoteId: noteId.toString(),
      userAddress: clients.account,
    },
  };

  const result = await runActionAndCheckProperties(
    async () => {
      const hash = await reclaimFunds(clients, delegatableNotesContract, noteId);

      // Wait for indexer to sync
      await waitForIndexerToSyncToTxHash(machinery, clients.publicClient, hash);

      return hash;
    },
    reclaimFundsMetadata,
    context,
    options
  );

  return result;
}
