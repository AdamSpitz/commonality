import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import {
  createAndSignStatement,
  createStatement,
  createGraphQLClient,
  believeStatement,
  disbelieveStatement,
  BeliefsAbi,
  MutableRefUpdaterAbi,
  type BeliefsContract,
  type MutableRefUpdaterContract,
} from '@commonality/sdk'

/**
 * E2E tests for user profile workflow.
 *
 * Tests the full workflow of:
 * - Viewing own profile (connected account)
 * - Viewing another user's profile
 * - Beliefs, disbeliefs, and indirect support tabs
 * - Navigation from profile to statements
 *
 * Strategy:
 * - Blockchain operations executed directly via SDK (bypassing wagmi)
 * - UI verified via Playwright after indexer sync
 */

test.describe('User Profile Workflow', () => {
  test('should view own profile and see beliefs', async ({ page, wallet }) => {
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    // Create viem test clients
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

    // Create a statement that ACCOUNT_0 will believe in
    const statement1Content = `Statement for profile test 1 at ${Date.now()}`
    const statement1Data = createStatement({
      content: statement1Content,
    })

    console.log('\n=== SETUP FOR PROFILE TEST ===')
    console.log('Creating statement 1:', statement1Content)

    const result1 = await createAndSignStatement(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefContract,
      },
      statement1Data,
      {
        graphqlClient,
        addToCreatedList: true,
      }
    )

    // Create a second statement
    const statement2Content = `Statement for profile test 2 at ${Date.now()}`
    const statement2Data = createStatement({
      content: statement2Content,
    })

    console.log('Creating statement 2:', statement2Content)

    const result2 = await createAndSignStatement(
      clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefContract,
      },
      statement2Data,
      {
        graphqlClient,
        addToCreatedList: true,
      }
    )

    // Connect wallet in UI
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Trigger IPFS sync
    await fetch(`${graphqlUrl.replace('/graphql', '')}/conceptspace/api/sync-ipfs`, {
      method: 'POST',
    })
    await page.waitForTimeout(500)

    // Navigate to profile page (own profile)
    await page.goto('/profile')

    // Wait for profile to load
    await page.waitForURL(/\/profile/)

    // Verify profile page loaded with connected address
    await expect(page.getByText(/my profile/i)).toBeVisible({
      timeout: 10000,
    })

    // Verify the wallet address is displayed
    const walletAddress = wallet.address!.toLowerCase()
    await expect(page.getByText(new RegExp(walletAddress.slice(0, 10), 'i'))).toBeVisible()

    // Click on Beliefs tab
    await page.getByRole('tab', { name: /beliefs/i }).click()

    // Verify the created statements appear in beliefs list
    await expect(page.getByText(statement1Content)).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByText(statement2Content)).toBeVisible()

    console.log('Own profile test passed!')
  })

  test('should view another user profile', async ({ page, wallet }) => {
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    // Create viem test clients for ACCOUNT_0
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

    // Create a statement that ACCOUNT_0 creates
    const statementContent = `Statement for other user profile test at ${Date.now()}`
    const statementData = createStatement({
      content: statementContent,
    })

    console.log('\n=== SETUP FOR OTHER USER PROFILE TEST ===')
    console.log('Creating statement:', statementContent)

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
      }
    )

    // Connect ACCOUNT_1 in UI
    await page.goto('/')
    await wallet.connect('ACCOUNT_1')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Trigger IPFS sync
    await fetch(`${graphqlUrl.replace('/graphql', '')}/conceptspace/api/sync-ipfs`, {
      method: 'POST',
    })
    await page.waitForTimeout(500)

    // Navigate to ACCOUNT_0's profile
    const account0Address = clients.account.address.toLowerCase()
    await page.goto(`/profile/${account0Address}`)

    // Verify profile page shows other user's address
    await expect(page.getByText(/user profile/i)).toBeVisible({
      timeout: 10000,
    })

    // Should show the other user's address
    await expect(page.getByText(new RegExp(account0Address.slice(0, 10), 'i'))).toBeVisible()

    // Click on Beliefs tab
    await page.getByRole('tab', { name: /beliefs/i }).click()

    // Verify ACCOUNT_0's statement appears
    await expect(page.getByText(statementContent)).toBeVisible({
      timeout: 15000,
    })

    console.log('Other user profile test passed!')
  })

  test('should view disbeliefs in user profile', async ({ page, wallet }) => {
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    // Create viem test clients
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

    // Create a statement that ACCOUNT_0 will disbelieve
    const statementContent = `Statement for disbelief profile test at ${Date.now()}`
    const statementData = createStatement({
      content: statementContent,
    })

    console.log('\n=== SETUP FOR DISBELIEF PROFILE TEST ===')
    console.log('Creating statement:', statementContent)

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
      }
    )

    // Create viem clients for ACCOUNT_1 to create the statement first
    const creatorClients = createE2ETestClients('ACCOUNT_1')
    const creatorBeliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }

    const creatorMutableRefContract: MutableRefUpdaterContract = {
      address: mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
    }

    const creatorStatementContent = `Creator statement for disbelief test at ${Date.now()}`
    const creatorStatementData = createStatement({
      content: creatorStatementContent,
    })

    await createAndSignStatement(
      creatorClients,
      {
        beliefs: creatorBeliefsContract,
        mutableRefUpdater: creatorMutableRefContract,
      },
      creatorStatementData,
      {
        graphqlClient,
        addToCreatedList: true,
      }
    )

    // Now express disbelief in the first statement
    console.log('Expressing disbelief from ACCOUNT_0...')

    await disbelieveStatement(
      clients,
      beliefsContract,
      result.cid
    )

    // Connect wallet in UI
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Trigger IPFS sync
    await fetch(`${graphqlUrl.replace('/graphql', '')}/conceptspace/api/sync-ipfs`, {
      method: 'POST',
    })
    await page.waitForTimeout(500)

    // Navigate to profile
    await page.goto('/profile')

    // Click on Disbeliefs tab
    await page.getByRole('tab', { name: /disbeliefs/i }).click()

    // Verify the disbelieved statement appears
    await expect(page.getByText(statementContent)).toBeVisible({
      timeout: 15000,
    })

    console.log('Disbelief profile test passed!')
  })

  test('should navigate from profile to statement', async ({ page, wallet }) => {
    const { beliefsAddress, mutableRefUpdaterAddress, graphqlUrl } =
      getContractAddresses()

    // Create viem test clients
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

    // Create a statement
    const statementContent = `Statement for profile to statement nav test at ${Date.now()}`
    const statementData = createStatement({
      content: statementContent,
    })

    console.log('\n=== SETUP FOR PROFILE TO STATEMENT NAVIGATION TEST ===')
    console.log('Creating statement:', statementContent)

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
      }
    )

    // Connect wallet in UI
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Trigger IPFS sync
    await fetch(`${graphqlUrl.replace('/graphql', '')}/conceptspace/api/sync-ipfs`, {
      method: 'POST',
    })
    await page.waitForTimeout(500)

    // Navigate to profile
    await page.goto('/profile')

    // Click on Beliefs tab
    await page.getByRole('tab', { name: /beliefs/i }).click()

    // Click on the statement card
    await expect(page.getByText(statementContent)).toBeVisible({
      timeout: 15000,
    })
    await page.getByText(statementContent).click()

    // Should navigate to statement page
    await page.waitForURL(/\/statement\//)

    // Verify statement page shows the statement content
    await expect(page.getByText(statementContent)).toBeVisible()

    console.log('Profile to statement navigation test passed!')
  })

  test('should show create statement button on own profile', async ({
    page,
    wallet,
  }) => {
    await page.goto('/')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Navigate to own profile
    await page.goto('/profile')

    // Verify "Create Statement" button is visible on own profile
    await expect(
      page.getByRole('button', { name: /create statement/i })
    ).toBeVisible()

    console.log('Create statement button on own profile test passed!')
  })

  test('should not show create statement button on other user profile', async ({
    page,
    wallet,
  }) => {
    const clients = createE2ETestClients('ACCOUNT_0')

    await page.goto('/')
    await wallet.connect('ACCOUNT_1')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Navigate to ACCOUNT_0's profile
    const account0Address = clients.account.address.toLowerCase()
    await page.goto(`/profile/${account0Address}`)

    // Wait for profile to load
    await expect(page.getByText(/user profile/i)).toBeVisible({
      timeout: 10000,
    })

    // "Create Statement" button should NOT be visible on other user's profile
    await expect(
      page.getByRole('button', { name: /create statement/i })
    ).not.toBeVisible()

    console.log('No create statement button on other user profile test passed!')
  })

  test('should show empty state for user with no beliefs', async ({
    page,
    wallet,
  }) => {
    // Use a fresh account that hasn't created any statements
    await page.goto('/')
    await wallet.connect('ACCOUNT_9')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Navigate to own profile
    await page.goto('/profile')

    // Click on Beliefs tab
    await page.getByRole('tab', { name: /beliefs/i }).click()

    // Should show empty state
    await expect(page.getByText(/no statements found/i)).toBeVisible({
      timeout: 10000,
    })

    console.log('Empty state for user with no beliefs test passed!')
  })
})
