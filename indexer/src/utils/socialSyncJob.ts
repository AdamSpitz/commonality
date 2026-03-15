/**
 * Background Social Data Sync Job
 *
 * Periodically fetches ENS names and Twitter data for users.
 * Runs every 5 minutes to pick up new users quickly, but only re-fetches
 * existing data once per day.
 */

import { eq, or, lt, isNull } from "ponder";
import { ConsoleLogger, Logger, wrapLoggerWithPrefix } from "./logger";
import { fetchEthereumAddressSocialData } from "./socialData";

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REFETCH_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const BATCH_SIZE = 50;

interface SocialSyncContext {
  db: any;
  log: Logger;
}

async function runSocialSyncIteration(ctx: SocialSyncContext): Promise<void> {
  try {
    const { userSocialData } = await import("../../ponder.schema.js");

    const staleThreshold = BigInt(Date.now() - REFETCH_AGE_MS);

    // Fetch users that either haven't been fetched or are stale
    const pending = await ctx.db
      .select()
      .from(userSocialData)
      .where(
        or(
          eq(userSocialData.socialDataFetched, false),
          lt(userSocialData.fetchedAt, staleThreshold),
          isNull(userSocialData.fetchedAt),
        )
      )
      .limit(BATCH_SIZE);

    if (pending.length === 0) {
      return;
    }

    ctx.log.info(`Found ${pending.length} users needing social data fetch`);

    let successCount = 0;
    let failureCount = 0;

    for (const row of pending) {
      try {
        const data = await fetchEthereumAddressSocialData(row.address);
        const now = BigInt(Date.now());

        await ctx.db
          .update(userSocialData, { address: row.address })
          .set({
            ensName: data.ensData?.ensName ?? null,
            twitterHandle: data.ensData?.twitterHandle ?? null,
            twitterFollowerCount: data.twitterApiData?.followerCount ?? null,
            isTwitterVerified: data.ensData?.isTwitterVerified ?? false,
            socialDataFetched: true,
            fetchedAt: now,
            error: data.ensData?.error ?? data.twitterApiData?.error ?? null,
          });

        successCount++;
      } catch (error) {
        ctx.log.warn(
          `Failed to fetch social data for ${row.address}: ${error instanceof Error ? error.message : error}`
        );
        failureCount++;
      }
    }

    ctx.log.info(`Social sync completed: ${successCount} succeeded, ${failureCount} failed`);
  } catch (error) {
    ctx.log.error(`Social sync iteration error: ${error}`);
  }
}

/**
 * Start the background social data sync job.
 * Returns a cleanup function to stop the job.
 */
export function startSocialSyncJob(db: any): () => void {
  const ctx: SocialSyncContext = {
    db,
    log: wrapLoggerWithPrefix("Social Sync", ConsoleLogger),
  };

  ctx.log.info(
    `Starting social data sync job (interval: ${SYNC_INTERVAL_MS / 1000}s, refetch age: ${REFETCH_AGE_MS / 1000 / 3600}h)`
  );

  // Run immediately on startup
  runSocialSyncIteration(ctx).catch((error) => {
    ctx.log.error(`Initial social sync failed: ${error}`);
  });

  // Then run periodically
  const intervalId = setInterval(() => {
    runSocialSyncIteration(ctx).catch((error) => {
      ctx.log.error(`Periodic social sync failed: ${error}`);
    });
  }, SYNC_INTERVAL_MS);

  return () => {
    clearInterval(intervalId);
    ctx.log.info("Social sync job stopped");
  };
}
