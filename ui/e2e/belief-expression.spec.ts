import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import { waitForIndexer, triggerSyncWithRetry, waitForStatement } from './utils/indexer'
import {
  createAndSignStatement,
  createStatement,
  believeStatement,
  disbelieveStatement,
  cidToBytes32,
  createGraphQLClient,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  createSDKMachinery,
} from '@commonality/sdk'

/**
 * E2E tests for belief expression workflow.
 *
 * Strategy (same as statement-creation):
 * - Smart contract transactions are executed directly via SDK (bypassing wagmi)
 * - UI updates are verified via Playwright after the indexer processes events
 *
 * Each test creates a fresh statement, then expresses belief/disbelief on it,
 * and verifies the statement page shows correct support metrics.
 *
 * Note: Statement content text is verified on the browse page (not detail page)
 * because the detail page's IPFS content fetch doesn't work in the browser yet
 * (VITE_IPFS_GATEWAY not wired through to SDK's fetchFromIPFS). The support
 * metrics on the detail page come from the GraphQL indexer and work correctly.
 */

/** Create a statement and wait for indexer to process it */
async function createTestStatement(
  accountName: 'ACCOUNT_0' | 'ACCOUNT_1',
  beliefsContract: BeliefsContract,
  mutableRefContract: MutableRefUpdaterContract,
  graphqlUrl: string
) {
  const clients = createE2ETestClients(accountName)
  const machinery = createSDKMachinery(graphqlUrl)

  const statementContent = `Belief test statement ${Date.now()}`
  const statementData = createStatement({ content: statementContent })

  const result = await createAndSignStatement(
    clients,
    {
      beliefs: beliefsContract,
      mutableRefUpdater: mutableRefContract,
    },
    statementData,
    {
      machinery,
      addToCreatedList: true,
      onIPFSUpload: (cid) => console.log('IPFS upload:', cid),
      onSigned: (txHash) => console.log('Statement signed:', txHash),
      onListUpdated: (txHash) => console.log('List updated:', txHash),
    }
  )

  // Wait for indexer to be ready
  await waitForIndexer(graphqlUrl)

  // Trigger IPFS sync with retry (fetches IPFS content for existing statements)
  await triggerSyncWithRetry(graphqlUrl)

  // Additional wait for indexer to process events
  await new Promise((r) => setTimeout(r, 2000))

  const statementCid = result.cid

  // Wait for statement to be indexed
  await waitForStatement(graphqlUrl, statementCid)

  return { cid: statementCid, statementContent }
}

test.describe('Belief Expression Workflow', () => {
  test('should express belief and see believer count increase on statement page', async ({
    page,
    wallet,
  }) => {
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    const beliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }
    const mutableRefContract: MutableRefUpdaterContract = {
      address: mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
    }

    // Connect wallet for UI display
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    console.log('\n=== CREATING STATEMENT FOR BELIEF TEST ===')

    // Create a statement via SDK
    const { cid } = await createTestStatement(
      'ACCOUNT_0',
      beliefsContract,
      mutableRefContract,
      graphqlUrl
    )

    console.log('Statement CID:', cid)

    // Navigate to statement detail page
    await page.goto(`/statement/${cid}`)

    // Verify the page loaded by checking support metrics
    // createAndSignStatement calls believeStatement internally, so creator = 1 believer
    await expect(page.getByText(/1 direct believer\b/)).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByText(/1 supporter\b/)).toBeVisible()

    console.log('Initial metrics verified: 1 direct believer')

    console.log('\n=== EXPRESSING BELIEF FROM ACCOUNT_1 ===')

    // Express belief from a different account via SDK (bypassing wagmi)
    const clients = createE2ETestClients('ACCOUNT_1')
    const believeTxHash = await believeStatement(
      clients,
      beliefsContract,
      cid
    )
    console.log('Belief tx hash:', believeTxHash)

    // Wait for indexer to process the belief event
    await new Promise((r) => setTimeout(r, 1000))

    // Reload the page to see updated metrics
    await page.reload()

    // Verify believer count increased to 2 (creator + ACCOUNT_1)
    await expect(page.getByText(/2 direct believers/)).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByText(/2 supporters/)).toBeVisible()

    console.log('Belief expression verified: 2 direct believers!')
  })

  test('should express disbelief and see disbeliever count on statement page', async ({
    page,
    wallet,
  }) => {
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    const beliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }
    const mutableRefContract: MutableRefUpdaterContract = {
      address: mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
    }

    // Connect wallet
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    console.log('\n=== CREATING STATEMENT FOR DISBELIEF TEST ===')

    // Create a statement via SDK
    const { cid } = await createTestStatement(
      'ACCOUNT_0',
      beliefsContract,
      mutableRefContract,
      graphqlUrl
    )

    console.log('Statement CID:', cid)

    // Express disbelief from a different account via SDK
    console.log('\n=== EXPRESSING DISBELIEF FROM ACCOUNT_2 ===')
    const clients = createE2ETestClients('ACCOUNT_2')
    const disbelieveTxHash = await disbelieveStatement(
      clients,
      beliefsContract,
      cid
    )
    console.log('Disbelief tx hash:', disbelieveTxHash)

    // Wait for indexer to process
    await new Promise((r) => setTimeout(r, 1000))

    // Navigate to statement page
    await page.goto(`/statement/${cid}`)

    // Verify creator's belief shows
    await expect(page.getByText(/1 direct believer\b/)).toBeVisible({
      timeout: 20000,
    })

    // Verify disbeliever count shows (SupportMetrics only renders this section when > 0)
    await expect(page.getByText(/1 disbeliever\b/)).toBeVisible({
      timeout: 5000,
    })

    console.log('Disbelief expression verified: 1 disbeliever!')
  })
})
