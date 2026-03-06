/**
 * Indexer utilities for E2E tests
 *
 * Provides functions to interact with the Ponder indexer API,
 * including retry logic for robustness.
 */

import { IpfsCidV1 } from "@commonality/sdk";

/**
 * Wait for the indexer to be ready by polling the GraphQL endpoint
 */
export async function waitForIndexer(
  graphqlUrl: string,
  maxAttempts = 30,
  intervalMs = 1000
): Promise<boolean> {
  const baseUrl = graphqlUrl.replace('/graphql', '')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ _meta { block { number } } }' }),
      })

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
 * Trigger the indexer's IPFS sync with retry logic
 * The sync fetches IPFS content for statements that don't have content yet
 */
export async function triggerSyncWithRetry(
  graphqlUrl: string,
  maxAttempts = 3,
  intervalMs = 2000
): Promise<{ success: boolean; message: string; syncedCount?: number; failedCount?: number }> {
  const baseUrl = graphqlUrl.replace('/graphql', '')

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const syncResponse = await fetch(`${baseUrl}/conceptspace/api/sync-ipfs`, {
        method: 'POST',
      })

      if (!syncResponse.ok) {
        throw new Error(`Sync failed with status ${syncResponse.status}`)
      }

      const syncResult = await syncResponse.json()
      console.log('IPFS sync result:', syncResult)
      return syncResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.warn(`Sync attempt ${attempt}/${maxAttempts} failed: ${errorMessage}`)

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, intervalMs))
      }
    }
  }

  return {
    success: false,
    message: 'Failed to sync after multiple attempts',
  }
}

/**
 * Wait for statement to be indexed with retry logic
 * Polls the GraphQL endpoint until the statement is found or timeout
 */
export async function waitForStatement(
  graphqlUrl: string,
  statementCid: IpfsCidV1,
  maxAttempts = 60,
  intervalMs = 500
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(graphqlUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `query GetStatement($id: String!) {
            statements(cidV1: $id) {
              cidV1
              believerCount
            }
          }`,
          variables: { id: statementCid },
        }),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.data?.statements) {
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
 * Create a statement and wait for it to be indexed with IPFS content.
 * 
 * IMPORTANT: This function enforces the correct ordering to ensure IPFS content
 * is fetched successfully. The correct order is:
 *   1. waitForIndexer - ensure indexer is ready
 *   2. waitForStatement - wait for statement row to exist in DB
 *   3. triggerSyncWithRetry - sync IPFS content (finds the statement)
 *   4. wait for IPFS content to be processed
 * 
 * If you trigger IPFS sync BEFORE the statement exists in the database,
 * syncedCount will be 0 because there's nothing to sync.
 */
export async function waitForStatementWithIPFS(
  graphqlUrl: string,
  statementCid: IpfsCidV1,
  options?: {
    waitForIndexerMaxAttempts?: number
    waitForStatementMaxAttempts?: number
    syncMaxAttempts?: number
    ipfsProcessingDelayMs?: number
  }
): Promise<boolean> {
  const {
    waitForIndexerMaxAttempts = 30,
    waitForStatementMaxAttempts = 60,
    syncMaxAttempts = 3,
    ipfsProcessingDelayMs = 2000,
  } = options ?? {}

  // Step 1: Wait for indexer to be ready
  const indexerReady = await waitForIndexer(graphqlUrl, waitForIndexerMaxAttempts)
  if (!indexerReady) {
    console.error('Indexer not ready, cannot process statement')
    return false
  }

  // Step 2: Wait for statement to exist in DB FIRST (critical!)
  // This must happen before IPFS sync, otherwise there's nothing to sync
  const statementFound = await waitForStatement(graphqlUrl, statementCid, waitForStatementMaxAttempts)
  if (!statementFound) {
    console.error(`Statement ${statementCid} not found in indexer`)
    return false
  }

  // Step 3: Trigger IPFS sync (will find the statement and fetch content)
  const syncResult = await triggerSyncWithRetry(graphqlUrl, syncMaxAttempts)
  if (!syncResult.success) {
    console.error('IPFS sync failed:', syncResult.message)
    return false
  }

  // Step 4: Wait for IPFS content to be processed
  await new Promise((r) => setTimeout(r, ipfsProcessingDelayMs))

  console.log(`Statement ${statementCid} indexed with IPFS content`)
  return true
}
