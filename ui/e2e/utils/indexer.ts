/**
 * Indexer utilities for E2E tests
 *
 * Provides functions to interact with the Ponder indexer API,
 * including retry logic for robustness.
 */

import { IpfsCidV1, cidToBytes32 } from "@commonality/sdk";

async function pollUntil(
  check: () => Promise<boolean>,
  maxAttempts: number,
  intervalMs: number
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (await check()) return true
    } catch {
      // Connection error, continue waiting
    }
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }
  return false
}

async function fetchHasItems(url: string): Promise<boolean> {
  const response = await fetch(url)
  if (!response.ok) return false
  const result = await response.json()
  return result.items && result.items.length > 0
}

async function fetchHasItemsArray(url: string): Promise<boolean> {
  const response = await fetch(url)
  if (!response.ok) return false
  const result = await response.json()
  return Array.isArray(result.items)
}

/**
 * Wait for the indexer to be ready by polling the REST /status endpoint
 */
export async function waitForIndexer(
  indexerUrl: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  const baseUrl = new URL(indexerUrl).origin
  const ready = await pollUntil(
    async () => (await fetch(`${baseUrl}/status`)).ok,
    maxAttempts,
    intervalMs
  )
  if (ready) console.log(`Indexer ready`)
  else console.warn(`Indexer not ready after ${maxAttempts} attempts`)
  return ready
}

/**
 * Wait for the event-cache REST API to be ready and returning the expected
 * list shape. This is separate from /status because tests exercise browser
 * client-side folding via /api/events, often through the Vite dev-server proxy.
 */
export async function waitForEventCacheApi(
  indexerUrl: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  const baseUrl = new URL(indexerUrl).origin
  const ready = await pollUntil(
    () => fetchHasItemsArray(`${baseUrl}/api/events?limit=1`),
    maxAttempts,
    intervalMs
  )
  if (ready) console.log(`Event cache API ready`)
  else console.warn(`Event cache API not ready after ${maxAttempts} attempts`)
  return ready
}

/**
 * Wait for statement to be indexed with retry logic.
 * Polls the events REST endpoint until a DirectSupport event for the statement is found.
 */
export async function waitForStatement(
  indexerUrl: string,
  statementCid: IpfsCidV1,
  maxAttempts = 60,
  intervalMs = 500
): Promise<boolean> {
  const baseUrl = new URL(indexerUrl).origin
  const cidBytes32 = cidToBytes32(statementCid)
  const found = await pollUntil(
    () => fetchHasItems(`${baseUrl}/api/events?eventName=DirectSupport&topic2=${cidBytes32}&limit=1`),
    maxAttempts,
    intervalMs
  )
  if (found) console.log(`Statement found`)
  else console.warn(`Statement ${statementCid} not found after ${maxAttempts} attempts`)
  return found
}

/**
 * Wait for a lazyGiving project creation event to appear in the event cache.
 * Polls until LazyGivingAssuranceContractCreated event for the given contract is found.
 */
export async function waitForProject(
  indexerUrl: string,
  assuranceContractAddress: string,
  maxAttempts = 60,
  intervalMs = 500
): Promise<boolean> {
  const baseUrl = new URL(indexerUrl).origin
  const paddedAddress = `0x${'0'.repeat(24)}${assuranceContractAddress.toLowerCase().replace(/^0x/, '')}`
  const found = await pollUntil(
    () => fetchHasItems(`${baseUrl}/api/events?eventName=LazyGivingAssuranceContractCreated&topic1=${paddedAddress}&limit=1`),
    maxAttempts,
    intervalMs
  )
  if (found) console.log(`Project found`)
  else console.warn(`Project ${assuranceContractAddress} not found after ${maxAttempts} attempts`)
  return found
}

/**
 * Wait for statement to be indexed.
 *
 * The correct order is:
 *   1. waitForIndexer - ensure indexer is ready
 *   2. waitForStatement - wait for DirectSupport event to appear in the events cache
 */
export async function waitForStatementWithIPFS(
  indexerUrl: string,
  statementCid: IpfsCidV1,
  options?: {
    waitForIndexerMaxAttempts?: number
    waitForStatementMaxAttempts?: number
  }
): Promise<boolean> {
  const {
    waitForIndexerMaxAttempts = 30,
    waitForStatementMaxAttempts = 60,
  } = options ?? {}

  if (!await waitForIndexer(indexerUrl, waitForIndexerMaxAttempts)) {
    console.error('Indexer not ready, cannot process statement')
    return false
  }

  if (!await waitForStatement(indexerUrl, statementCid, waitForStatementMaxAttempts)) {
    console.error(`Statement ${statementCid} not found in indexer`)
    return false
  }

  console.log(`Statement ${statementCid} indexed`)
  return true
}
