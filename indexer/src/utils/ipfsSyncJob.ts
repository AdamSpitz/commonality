/**
 * Background IPFS Sync Job
 *
 * This module provides a background job that periodically retries fetching IPFS data.
 *
 * This solves the problem of fire-and-forget IPFS fetches in event handlers
 * by providing a retry mechanism for failed fetches.
 */

import { ConsoleLogger, Logger, wrapLoggerWithPrefix } from "./logger";

// Configuration
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 10;

export interface SyncJobContext {
  ipfsGateway: string;
  db: any;
  log: Logger;
}

export type IpfsSyncIterationFn = (ctx: SyncJobContext) => Promise<void>;

export type IpfsSyncJobDesc = {
  name: string;
  iterationFn: IpfsSyncIterationFn;
}

function startIpfsSyncJob(ipfsGateway: string, db: any, name: string, iterationFn: IpfsSyncIterationFn): () => void {
  const prefix = `IPFS Sync - ${name}`;
  const ctx: SyncJobContext = { ipfsGateway, db, log: wrapLoggerWithPrefix(prefix, ConsoleLogger) };
  
  ctx.log.info(
    `Starting IPFS sync job (interval: ${SYNC_INTERVAL_MS / 1000}s, max retries: ${MAX_RETRIES})`
  );

  // Run immediately on startup
  iterationFn(ctx).catch((error) => {
    ctx.log.error(`Initial IPFS sync failed: ${error}`);
  });

  // Then run periodically
  const intervalId = setInterval(() => {
    iterationFn(ctx).catch((error) => {
      ctx.log.error(`Periodic IPFS sync failed: ${error}`);
    });
  }, SYNC_INTERVAL_MS);

  // Return stop function
  return () => {
    clearInterval(intervalId);
    ctx.log.info(`IPFS sync job stopped`);
  };
}

/**
 * Start the background IPFS sync job
 * Returns a cleanup function to stop the job
 */
export function startIpfsSyncJobs(ipfsGateway: string, db: any, jobDescs: Array<IpfsSyncJobDesc>): () => void {
  const stopFunctions = jobDescs.map(({ name, iterationFn }) =>
    startIpfsSyncJob(ipfsGateway, db, name, iterationFn)
  );

  // Return stop function
  return () => {
    stopFunctions.forEach((stop) => stop());
  };
}
