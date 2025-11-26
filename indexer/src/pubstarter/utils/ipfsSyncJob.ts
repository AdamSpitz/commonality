/**
 * Background IPFS Metadata Sync Job for Pubstarter
 *
 * This module provides a background job that periodically retries fetching
 * IPFS metadata for projects where metadataFetched = false.
 *
 * This solves the problem of fire-and-forget IPFS fetches in event handlers
 * by providing a retry mechanism for failed fetches.
 */

import { fetchProjectMetadata } from "./ipfs.js";

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
 * Track retry attempts per project to avoid excessive retries
 */
const retryAttempts = new Map<string, number>();
const firstSeenAt = new Map<string, number>();

/**
 * Fetch and update a single project's IPFS metadata
 */
async function syncProjectMetadata(
  ctx: SyncJobContext,
  project: {
    id: string;
    metadataCid: string | null;
    createdAt: bigint;
  }
): Promise<boolean> {
  const projectId = project.id;
  const now = Date.now();

  // Skip if no metadata CID
  if (!project.metadataCid) {
    return false;
  }

  // Track retry attempts
  if (!retryAttempts.has(projectId)) {
    retryAttempts.set(projectId, 0);
    firstSeenAt.set(projectId, now);
  }

  const attempts = retryAttempts.get(projectId)!;
  const firstSeen = firstSeenAt.get(projectId)!;

  // Check if we should give up
  if (attempts >= MAX_RETRIES) {
    ctx.log.warn(
      `Giving up on project ${projectId} after ${attempts} attempts`
    );
    // Clean up tracking
    retryAttempts.delete(projectId);
    firstSeenAt.delete(projectId);
    return false;
  }

  if (now - firstSeen > RETRY_TIMEOUT_MS) {
    ctx.log.warn(
      `Giving up on project ${projectId} after 24 hours (${attempts} attempts)`
    );
    // Clean up tracking
    retryAttempts.delete(projectId);
    firstSeenAt.delete(projectId);
    return false;
  }

  // Try to fetch metadata
  try {
    const metadata = await fetchProjectMetadata(project.metadataCid);

    if (!metadata) {
      // Fetch failed, increment retry counter
      retryAttempts.set(projectId, attempts + 1);
      return false;
    }

    // Success! Update the database
    // Import projects schema - this needs to be done dynamically
    // to avoid circular dependencies
    const { projects } = await import("../../../ponder.schema.js");

    await ctx.db
      .update(projects, { id: projectId })
      .set({
        metadataContent: JSON.stringify(metadata),
        metadataFetched: true,
      });

    ctx.log.info(`Successfully synced IPFS metadata for project ${projectId}`);

    // Clean up tracking
    retryAttempts.delete(projectId);
    firstSeenAt.delete(projectId);

    return true;
  } catch (error) {
    ctx.log.error(
      `Error syncing project ${projectId}: ${error}`
    );
    retryAttempts.set(projectId, attempts + 1);
    return false;
  }
}

/**
 * Run a single sync iteration - fetch pending projects and retry IPFS fetches
 */
export async function runIpfsSyncIteration(ctx: SyncJobContext): Promise<void> {
  try {
    // Import projects schema dynamically
    const { projects } = await import("../../../ponder.schema.js");
    const { eq, and, isNotNull } = await import("ponder");

    // Query for projects that have a metadataCid but haven't had their content fetched yet
    const pendingProjects = await ctx.db
      .select()
      .from(projects)
      .where(
        and(
          isNotNull(projects.metadataCid),
          eq(projects.metadataFetched, false)
        )
      )
      .limit(100); // Process in batches to avoid overwhelming the system

    if (pendingProjects.length === 0) {
      // No pending projects, nothing to do
      return;
    }

    ctx.log.info(
      `IPFS sync job: Found ${pendingProjects.length} projects with pending metadata fetches`
    );

    // Process each project
    let successCount = 0;
    let failureCount = 0;

    for (const project of pendingProjects) {
      const success = await syncProjectMetadata(ctx, project);
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
 * Start the background IPFS sync job for project metadata
 * Returns a cleanup function to stop the job
 */
export function startIpfsSyncJob(ctx: SyncJobContext): () => void {
  ctx.log.info(
    `Starting project metadata IPFS sync job (interval: ${SYNC_INTERVAL_MS / 1000}s, max retries: ${MAX_RETRIES})`
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
    ctx.log.info("Project metadata IPFS sync job stopped");
  };
}
