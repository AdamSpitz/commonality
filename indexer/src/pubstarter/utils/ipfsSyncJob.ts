/**
 * Background IPFS Metadata Sync Job for Pubstarter
 *
 * This module provides a background job that periodically retries fetching
 * IPFS metadata for projects where metadataFetched = false.
 *
 * This solves the problem of fire-and-forget IPFS fetches in event handlers
 * by providing a retry mechanism for failed fetches.
 */

import { SyncJobContext } from "../../utils/ipfsSyncJob.js";
import { fetchProjectMetadata } from "./ipfs.js";

// Configuration
const MAX_RETRIES = 10;
const RETRY_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24 hours

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
    const metadata = await fetchProjectMetadata(ctx.ipfsGateway, project.metadataCid);

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
export async function runPubstarterIpfsSyncIteration(ctx: SyncJobContext): Promise<void> {
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
