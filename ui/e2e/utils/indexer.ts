/**
 * Indexer utilities for E2E tests
 *
 * Provides functions to interact with the Ponder indexer API,
 * including retry logic for robustness.
 */

import { IpfsCidV1, cidToBytes32 } from "@commonality/sdk";

/**
 * Wait for the indexer to be ready by polling the REST /status endpoint
 */
export async function waitForIndexer(
  indexerUrl: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  const baseUrl = new URL(indexerUrl).origin

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/status`)

      if (response.ok) {
        console.log(`Indexer ready after ${attempt} attempts`)
        return true
      }
    } catch {
      // Connection refused or other error, continue waiting
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }

  console.warn(`Indexer not ready after ${maxAttempts} attempts`)
  return false
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

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(
        `${baseUrl}/api/events?eventName=DirectSupport&topic2=${cidBytes32}&limit=1`
      )

      if (response.ok) {
        const result = await response.json()
        if (result.items && result.items.length > 0) {
          console.log(`Statement found after ${attempt} attempts`)
          return true
        }
      }
    } catch {
      // Connection error, continue waiting
    }

    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, intervalMs))
    }
  }

  console.warn(`Statement ${statementCid} not found after ${maxAttempts} attempts`)
  return false
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

  // Step 1: Wait for indexer to be ready
  const indexerReady = await waitForIndexer(indexerUrl, waitForIndexerMaxAttempts)
  if (!indexerReady) {
    console.error('Indexer not ready, cannot process statement')
    return false
  }

  // Step 2: Wait for DirectSupport event to appear in the events cache
  const statementFound = await waitForStatement(indexerUrl, statementCid, waitForStatementMaxAttempts)
  if (!statementFound) {
    console.error(`Statement ${statementCid} not found in indexer`)
    return false
  }

  console.log(`Statement ${statementCid} indexed`)
  return true
}
