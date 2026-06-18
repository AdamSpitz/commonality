import { test, expect } from './fixtures/wallet'
import { createE2EWriteClients, getContractAddresses } from './utils/blockchain'
import { waitForStatementWithIPFS } from './utils/indexer'
import {
  createAndSignStatement,
  createStatement,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  createSDKMachinery,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
} from '@commonality/sdk'

/**
 * E2E tests for user profile workflow.
 *
 * IMPORTANT: These tests use client-side navigation (clicking nav links)
 * instead of page.goto() because wagmi's mock wallet state doesn't survive
 * full-page navigations. The wallet must be connected first, then we navigate
 * using the UI's navigation links.
 *
 * Test strategy:
 * - Create a statement and express belief via SDK (bypassing wagmi)
 * - Navigate to profile page via UI navigation (preserves wallet state)
 * - Verify profile page shows the user's beliefs
 */

/** Create a statement and wait for indexer to process it */
async function createTestStatement(
  accountName: 'ACCOUNT_0' | 'ACCOUNT_1',
  beliefsContract: BeliefsContract,
  mutableRefContract: MutableRefUpdaterContract,
  graphqlUrl: string
) {
  const clients = createE2EWriteClients(accountName)
  const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars();
  const machinery = createSDKMachinery(ipfsConfig, undefined, { areWeJustRunningTests: true, shouldTestsBeVerbose: false })

  const statementContent = `Profile test statement ${Date.now()}`
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

  // Use the combined helper that enforces correct ordering
  await waitForStatementWithIPFS(graphqlUrl, result.cid)

  return { cid: result.cid, statementContent }
}

test.describe('User Profile Workflow', () => {
  test('should display connected user profile with beliefs', async ({
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

    // Connect wallet first (before any navigation)
    await page.goto('/start')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    console.log('\n=== CREATING STATEMENT FOR PROFILE TEST ===')

    // Create a statement via SDK (this also expresses belief automatically)
    const { cid, statementContent } = await createTestStatement(
      'ACCOUNT_0',
      beliefsContract,
      mutableRefContract,
      graphqlUrl
    )

    console.log('Statement CID:', cid)
    console.log('Statement content:', statementContent)

    // Navigate to profile page via client-side navigation (clicking nav link)
    // This preserves the wallet state, unlike page.goto('/profile')
    // Use the specific nav bar link (in the top app bar, not buttons on home page)
    console.log('Navigating to profile page via nav link...')
    // Click the "My Profile" link in the top navigation bar (AppBar)
    await page.locator('header').getByRole('link', { name: 'My Profile' }).click()

    // Verify "My Profile" heading is displayed
    await expect(page.getByRole('heading', { name: /my profile/i })).toBeVisible()

    // Verify the user's address is displayed
    await expect(page.getByText(wallet.address!)).toBeVisible()

    // Verify "Create Statement" button is visible (only on own profile)
    await expect(
      page.getByRole('button', { name: /create statement/i })
    ).toBeVisible()

    // Verify the Beliefs tab is active and shows at least 1 belief
    // Use exact match for "Beliefs (X)" since "Disbeliefs" also contains "beliefs"
    await expect(
      page.getByRole('tab', { name: /^Beliefs \(\d+\)$/ }).first()
    ).toHaveAttribute('aria-selected', 'true')

    // The statement we just created should appear in the beliefs list
    // Use first() because the page may show multiple statements
    await expect(page.getByText(statementContent).first()).toBeVisible({
      timeout: 20000,
    })

    // Verify statement card shows correct metrics
    await expect(page.getByText(/1 believers?/i).first()).toBeVisible()

    console.log('Profile page displayed correctly with beliefs!')
  })

  test('should switch between tabs on profile page', async ({
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

    // Connect wallet first
    await page.goto('/start')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    console.log('\n=== CREATING STATEMENTS FOR TAB TEST ===')

    // Create a statement and express disbelief from another account
    const { cid } = await createTestStatement(
      'ACCOUNT_1',
      beliefsContract,
      mutableRefContract,
      graphqlUrl
    )

    // Express disbelief from ACCOUNT_0
    console.log('Expressing disbelief from ACCOUNT_0...')
    const clients = createE2EWriteClients('ACCOUNT_0')
    const { disbelieveStatement } = await import('@commonality/sdk')
    await disbelieveStatement(clients, beliefsContract, cid)

    // Wait for disbelief to be indexed
    await waitForStatementWithIPFS(graphqlUrl, cid)

    // Navigate to profile via nav link (in AppBar header)
    await page.locator('header').getByRole('link', { name: 'My Profile' }).click()

    // Verify we're on the Beliefs tab by default
    await expect(
      page.getByRole('tab', { name: /^Beliefs \(\d+\)$/ }).first()
    ).toHaveAttribute('aria-selected', 'true')

    // Click on Disbeliefs tab
    await page.getByRole('tab', { name: /disbeliefs/i }).click()

    // Verify Disbeliefs tab is now active
    await expect(
      page.getByRole('tab', { name: /disbeliefs/i })
    ).toHaveAttribute('aria-selected', 'true')

    // The statement we disbelieved should appear in the disbeliefs list
    await expect(page.getByText(/profile test statement/i).first()).toBeVisible(
      { timeout: 20000 }
    )

    // Click on Indirect Support tab
    await page.getByRole('tab', { name: /indirect support/i }).click()

    // Verify Indirect Support tab is now active
    await expect(
      page.getByRole('tab', { name: /indirect support/i })
    ).toHaveAttribute('aria-selected', 'true')

    // Should show the "no indirect support" message
    await expect(
      page.getByText(/no indirect support found/i)
    ).toBeVisible()

    console.log('Tab switching works correctly!')
  })

  test('should view other user profile via URL', async ({ page, wallet }) => {
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

    // Connect wallet first
    await page.goto('/start')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    console.log('\n=== CREATING STATEMENT FOR OTHER USER PROFILE TEST ===')

    // Create a statement from ACCOUNT_1 (different user)
    const clients = createE2EWriteClients('ACCOUNT_1')
    const account1Address = clients.account

    await createTestStatement(
      'ACCOUNT_1',
      beliefsContract,
      mutableRefContract,
      graphqlUrl
    )

    console.log('Account 1 address:', account1Address)

    // Navigate to ACCOUNT_1's profile page via URL
    // Note: For viewing other profiles, we can use page.goto since wallet
    // connection doesn't need to persist for viewing other users
    await page.goto(`/user/${account1Address}`)

    // Verify "User Profile" heading is displayed (not "My Profile")
    await expect(
      page.getByRole('heading', { name: /user profile/i })
    ).toBeVisible()

    // Verify the address is displayed
    await expect(page.getByText(account1Address)).toBeVisible()

    // Verify "Create Statement" button is NOT visible (not own profile)
    const createStatementButton = page.getByRole('button', {
      name: /create statement/i,
    })
    await expect(createStatementButton).not.toBeVisible()

    // Wait for the profile data to load
    await expect(page.getByRole('tab', { name: /beliefs/i }).first()).toBeVisible()

    console.log('Other user profile page displayed correctly!')
  })
})
