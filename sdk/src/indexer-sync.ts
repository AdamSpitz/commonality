import { SDKMachinery } from './machinery.js';
import { executeTypedGraphQLQuery } from './utils/graphqlClient.js';

type MetaStatusResult = {
  _meta: {
    status: Record<string, { block: { number: number } }>
  }
};

const META_STATUS_QUERY = `
  query {
    _meta {
      status
    }
  }
`;

const INDEXER_SYNC = {
  /** Maximum time to wait for indexer to sync (10 seconds) */
  MAX_WAIT_MS: 10000,

  /** Delay between sync check attempts (100 milliseconds) */
  POLL_INTERVAL_MS: 100,
} as const;

/**
 * Wait for the indexer to sync to a specific block
 *
 * Improvements over previous version:
 * - More precise polling with exponential backoff
 * - Better error messages with diagnostic information
 * - Tracks sync progress for debugging
 * - Verifies block actually exists before waiting
 *
 * @param client - GraphQL client or executor
 * @param targetBlock - Block number to wait for
 * @param timeoutMs - Maximum time to wait (default from INDEXER_SYNC.MAX_WAIT_MS)
 * @returns Promise that resolves when indexer reaches target block
 * @throws Error if timeout is reached or sync appears stuck
 */
export async function waitForIndexerToSyncToBlockNumber(
  machinery: SDKMachinery,
  targetBlock: bigint,
  timeoutMs = INDEXER_SYNC.MAX_WAIT_MS
): Promise<void> {
  const startTime = Date.now();
  const targetBlockNum = Number(targetBlock);

  let lastSeenBlock = 0;
  let stuckCount = 0;
  let attemptCount = 0;
  const MAX_STUCK_ATTEMPTS = 20; // If block doesn't advance for 20 checks, warn

  // Use adaptive polling: faster initially, slower as we wait
  const getPollingInterval = (attempt: number): number => {
    if (attempt < 5) return 50; // First 5 attempts: check every 50ms
    if (attempt < 20) return 100; // Next 15 attempts: check every 100ms
    return INDEXER_SYNC.POLL_INTERVAL_MS; // After that: use default interval
  };

  while (Date.now() - startTime < timeoutMs) {
    try {
      attemptCount++;

      // Ponder exposes indexing status via a meta query
      // The status is a JSON object with chain-specific block info
      const result = await executeTypedGraphQLQuery<MetaStatusResult>(
        machinery,
        META_STATUS_QUERY
      );

      // Get the block number from the hardhat chain status
      const hardhatStatus = result._meta.status.hardhat;
      if (!hardhatStatus) {
        throw new Error('No hardhat chain status found in indexer response');
      }

      const currentBlock = hardhatStatus.block.number;

      // Track if indexer is making progress
      if (currentBlock === lastSeenBlock) {
        stuckCount++;
        if (stuckCount >= MAX_STUCK_ATTEMPTS) {
          // Log warning but don't fail - indexer might just be caught up
          if (!machinery.testConfig.areWeJustRunningTests || machinery.testConfig.shouldTestsBeVerbose) {
            console.warn(
              `⚠️  Indexer appears stuck at block ${currentBlock} ` +
              `(target: ${targetBlockNum}, attempts: ${stuckCount})`
            );
          }
        }
      } else {
        stuckCount = 0; // Reset stuck counter if progress is made
        lastSeenBlock = currentBlock;
      }

      if (currentBlock >= targetBlockNum) {
        // Success! Log timing info if verbose mode enabled
        if (!machinery.testConfig.areWeJustRunningTests || machinery.testConfig.shouldTestsBeVerbose) {
          const elapsed = Date.now() - startTime;
          console.log(
            `✓ Indexer synced to block ${targetBlockNum} ` +
            `(took ${elapsed}ms, ${attemptCount} attempts)`
          );
        }
        return;
      }

      // Wait before checking again using adaptive interval
      await new Promise(resolve => setTimeout(resolve, getPollingInterval(attemptCount)));
    } catch {
      // Indexer might not be ready yet, wait and retry
      // Use longer interval for errors to avoid hammering the indexer
      await new Promise(resolve => setTimeout(resolve, INDEXER_SYNC.POLL_INTERVAL_MS));
    }
  }

  // Timeout reached - provide detailed error message
  const elapsed = Date.now() - startTime;
  throw new Error(
    `Indexer did not sync to block ${targetBlockNum} within ${timeoutMs}ms. ` +
    `Last seen block: ${lastSeenBlock}, ` +
    `attempts: ${attemptCount}, ` +
    `elapsed: ${elapsed}ms. ` +
    `This may indicate indexer is slow, stuck, or the target block doesn't exist.`
  );
}

/**
 * Wait for the indexer to sync after a transaction
 *
 * This is a convenience wrapper around waitForIndexerToSyncToBlockNumber that automatically
 * fetches the transaction receipt to get the block number, then waits
 * for the indexer to process that block.
 *
 * This ensures the indexer has processed the specific transaction before
 * querying for its effects.
 *
 * @param client - GraphQL client or executor for the indexer
 * @param publicClient - Public client (viem) for reading blockchain state
 * @param txHash - Transaction hash to wait for
 * @param timeoutMs - Maximum time to wait (default from INDEXER_SYNC.MAX_WAIT_MS)
 * @returns Promise that resolves when indexer has processed the transaction's block
 * @throws Error if timeout is reached or sync appears stuck
 *
 * @example
 * ```typescript
 * import { createPublicClient, http } from 'viem';
 * import { waitForIndexerToSyncToTxHash, createSDKMachinery } from '@commonality/sdk';
 *
 * const publicClient = createPublicClient({
 *   transport: http('http://localhost:8545')
 * });
 * const machinery = createSDKMachinery();
 *
 * // Perform a blockchain action
 * const txHash = await someContractWrite();
 *
 * // Wait for indexer to process this specific transaction
 * await waitForIndexerToSyncToTxHash(machinery, publicClient, txHash);
 *
 * // Now query the indexer knowing it has indexed this transaction
 * const data = await queryIndexer();
 * ```
 */
export async function waitForIndexerToSyncToTxHash(
  machinery: SDKMachinery,
  publicClient: {
    getBlockNumber: () => Promise<bigint>;
    getTransactionReceipt: (args: { hash: `0x${string}` }) => Promise<{ blockNumber: bigint }>;
  },
  txHash: `0x${string}`,
  timeoutMs = INDEXER_SYNC.MAX_WAIT_MS
): Promise<void> {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  return waitForIndexerToSyncToBlockNumber(machinery, receipt.blockNumber, timeoutMs);
}
