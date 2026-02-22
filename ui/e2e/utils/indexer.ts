/**
 * Indexer utilities for E2E tests
 *
 * Provides functions to interact with the Ponder indexer API,
 * including retry logic for robustness.
 */

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
  statementId: string,
  maxAttempts = 20,
  intervalMs = 2000
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
          variables: { id: statementId.toLowerCase() },
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

  console.warn(`Statement ${statementId} not found after ${maxAttempts} attempts`)
  return false
}
