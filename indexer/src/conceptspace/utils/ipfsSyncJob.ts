/**
 * Background IPFS Content Sync Job
 *
 * This module provides a background job that periodically retries fetching
 * IPFS content for statements where contentFetched = false.
 *
 * This solves the problem of fire-and-forget IPFS fetches in event handlers
 * by providing a retry mechanism for failed fetches.
 */

import { fetchStatementContent, extractExcerpt } from "./ipfs.js";

// Configuration
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 10;
const RETRY_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SyncJobContext {
  db: any;
  log: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
}

/**
 * Track retry attempts per statement to avoid excessive retries
 */
const retryAttempts = new Map<string, number>();
const firstSeenAt = new Map<string, number>();

/**
 * Fetch and update a single statement's IPFS content
 */
async function syncStatementContent(
  ctx: SyncJobContext,
  statement: {
    id: string;
    cid: string;
    createdAt: bigint;
  }
): Promise<boolean> {
  const statementId = statement.id;
  const now = Date.now();

  // Track retry attempts
  if (!retryAttempts.has(statementId)) {
    retryAttempts.set(statementId, 0);
    firstSeenAt.set(statementId, now);
  }

  const attempts = retryAttempts.get(statementId)!;
  const firstSeen = firstSeenAt.get(statementId)!;

  // Check if we should give up
  if (attempts >= MAX_RETRIES) {
    ctx.log.warn(
      `Giving up on statement ${statementId} after ${attempts} attempts`
    );
    // Clean up tracking
    retryAttempts.delete(statementId);
    firstSeenAt.delete(statementId);
    return false;
  }

  if (now - firstSeen > RETRY_TIMEOUT_MS) {
    ctx.log.warn(
      `Giving up on statement ${statementId} after 24 hours (${attempts} attempts)`
    );
    // Clean up tracking
    retryAttempts.delete(statementId);
    firstSeenAt.delete(statementId);
    return false;
  }

  // Try to fetch content
  try {
    const content = await fetchStatementContent(statement.cid);

    if (!content) {
      // Fetch failed, increment retry counter
      retryAttempts.set(statementId, attempts + 1);
      return false;
    }

    // Success! Update the database
    // Import statements schema - this needs to be done dynamically
    // to avoid circular dependencies
    const { statements } = await import("../../../ponder.schema.js");

    await ctx.db
      .update(statements, { id: statementId })
      .set({
        content: JSON.stringify(content),
        statementType: content.statementType,
        title: content.metadata?.title || null,
        excerpt: extractExcerpt(content.content),
        contentFetched: true,
      });

    ctx.log.info(`Successfully synced IPFS content for statement ${statementId}`);

    // Clean up tracking
    retryAttempts.delete(statementId);
    firstSeenAt.delete(statementId);

    return true;
  } catch (error) {
    ctx.log.error(
      `Error syncing statement ${statementId}: ${error}`
    );
    retryAttempts.set(statementId, attempts + 1);
    return false;
  }
}

/**
 * Run a single sync iteration - fetch pending statements and retry IPFS fetches
 */
export async function runIpfsSyncIteration(ctx: SyncJobContext): Promise<void> {
  try {
    // Import statements schema dynamically
    const { statements } = await import("../../../ponder.schema.js");
    const { eq } = await import("ponder");

    // Query for statements that haven't had their content fetched yet
    const pendingStatements = await ctx.db
      .select()
      .from(statements)
      .where(eq(statements.contentFetched, false))
      .limit(100); // Process in batches to avoid overwhelming the system

    if (pendingStatements.length === 0) {
      // No pending statements, nothing to do
      return;
    }

    ctx.log.info(
      `IPFS sync job: Found ${pendingStatements.length} statements with pending content fetches`
    );

    // Process each statement
    let successCount = 0;
    let failureCount = 0;

    for (const statement of pendingStatements) {
      const success = await syncStatementContent(ctx, statement);
      if (success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    ctx.log.info(
      `IPFS sync job completed: ${successCount} succeeded, ${failureCount} failed`
    );
  } catch (error) {
    ctx.log.error(`IPFS sync job error: ${error}`);
  }
}

/**
 * Start the background IPFS sync job
 * Returns a cleanup function to stop the job
 */
export function startIpfsSyncJob(ctx: SyncJobContext): () => void {
  ctx.log.info(
    `Starting IPFS sync job (interval: ${SYNC_INTERVAL_MS / 1000}s, max retries: ${MAX_RETRIES})`
  );

  // Run immediately on startup
  runIpfsSyncIteration(ctx).catch((error) => {
    ctx.log.error(`Initial IPFS sync failed: ${error}`);
  });

  // Then run periodically
  const intervalId = setInterval(() => {
    runIpfsSyncIteration(ctx).catch((error) => {
      ctx.log.error(`Periodic IPFS sync failed: ${error}`);
    });
  }, SYNC_INTERVAL_MS);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    ctx.log.info("IPFS sync job stopped");
  };
}
