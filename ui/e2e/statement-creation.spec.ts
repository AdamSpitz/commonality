import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import {
  createAndSignStatement,
  createStatement,
  createGraphQLClient,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
} from '@commonality/sdk'

/**
 * E2E test for full statement creation workflow.
 *
 * Strategy:
 * - UI interactions are tested via Playwright (form display, validation)
 * - Smart contract transactions are executed directly via SDK (bypassing wagmi)
 * - UI updates are verified after indexer processes the events
 *
 * Why bypass wagmi for signing?
 * - wagmi's mock connector doesn't support private key signing
 * - Creating a custom connector is complex (~200-300 lines)
 * - This approach keeps UI code idiomatic (wagmi) while making tests reliable
 *
 * These tests use:
 * - Playwright for browser automation
 * - Hardhat node (started by Docker via global-setup.ts)
 * - Viem test clients for contract interactions
 * - Real IPFS, contracts, and GraphQL indexer (not mocked)
 */

test.describe('Statement Creation Workflow', () => {
  test('should create a statement and see it appear on browse page', async ({
    page,
    wallet,
  }) => {
    // Get contract addresses from .env file (written by global-setup.ts)
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    // Navigate to home page and connect wallet (for UI display)
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Create statement data
    const statementContent = `Test statement created at ${Date.now()}`
    const statementData = createStatement({
      content: statementContent,
    })

    console.log('\n=== CREATING STATEMENT ===')
    console.log('Statement content:', statementContent)
    console.log('Wallet address:', wallet.address)

    // Create viem test clients for direct contract interaction
    const clients = createE2ETestClients('ACCOUNT_0')

    const beliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }

    const mutableRefContract: MutableRefUpdaterContract = {
      address: mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
    }

    const graphqlClient = createGraphQLClient(graphqlUrl)

    // Execute the statement creation workflow directly (bypassing UI)
    const result = await createAndSignStatement(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefContract,
      },
      statementData,
      {
        graphqlClient,
        addToCreatedList: true,
        onIPFSUpload: (cid) => {
          console.log('Statement uploaded to IPFS:', cid)
        },
        onSigned: (txHash) => {
          console.log('Statement signed, tx hash:', txHash)
        },
        onListUpdated: (txHash) => {
          console.log('Created list updated, tx hash:', txHash)
        },
      }
    )

    console.log('Statement created successfully!')
    console.log('CID:', result.cid)
    console.log('Sign tx hash:', result.signTxHash)
    console.log('Update list tx hash:', result.updateListTxHash)

    // Wait a bit for the indexer to process the blockchain events
    await page.waitForTimeout(1000)

    // Trigger IPFS content sync manually
    // The background sync job runs every 5 minutes, but E2E tests need immediate results
    console.log('Triggering manual IPFS sync...')
    const syncResponse = await fetch(`${graphqlUrl.replace('/graphql', '')}/conceptspace/api/sync-ipfs`, {
      method: 'POST',
    })
    const syncResult = await syncResponse.json()
    console.log('IPFS sync result:', syncResult)

    // Wait a bit more for the sync to complete
    await page.waitForTimeout(500)

    // Navigate to browse page
    await page.goto('/statements')

    // The statement should appear in the list (after indexer processes it)
    // Increased timeout because indexer may need time to sync
    await expect(page.getByText(statementContent)).toBeVisible({
      timeout: 20000,
    })

    console.log('Statement found on browse page!')
  })

  test('should show validation error for empty statement', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Show the form
    await page
      .getByRole('button', { name: /create and sign statement/i })
      .click()

    await expect(
      page.getByRole('heading', { name: /create a statement/i })
    ).toBeVisible()

    // Try to submit without content (button should be disabled)
    const submitButton = page.getByRole('button', {
      name: /create and sign statement/i,
    })
    await expect(submitButton).toBeDisabled()

    // Fill with only whitespace
    const contentField = page.getByRole('textbox', {
      name: /statement content/i,
    })
    await contentField.fill('   ')

    // Submit button should still be disabled
    await expect(submitButton).toBeDisabled()
  })
})
