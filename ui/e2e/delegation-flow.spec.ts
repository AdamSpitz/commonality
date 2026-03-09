import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import { waitForIndexer } from './utils/indexer'
import {
  DelegatableNotesAbi,
  PubstarterAbi,
  depositETH,
  delegateNote,
  purchaseFromPrimaryMarketWithNotes,
  createProject,
  uploadToIPFS,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  type DelegatableNotesContract,
  type PubstarterContract,
} from '@commonality/sdk'
import { parseEther } from 'viem'

/**
 * E2E test for the deposit → delegate → spend flow.
 *
 * This test verifies the full delegation lifecycle:
 * 1. ACCOUNT_0 deposits ETH as a delegatable note
 * 2. ACCOUNT_0 delegates the note to ACCOUNT_1
 * 3. UI shows the delegated note in ACCOUNT_1's "Notes I Control" section
 * 4. Note detail page shows the delegation chain (Root: ACCOUNT_0, Leaf: ACCOUNT_1)
 * 5. ACCOUNT_1 spends the note on a pubstarter project
 * 6. Note is shown as inactive after spending
 *
 * Strategy (same as other E2E tests):
 * - All blockchain transactions via SDK directly (bypasses wagmi's signing limitations)
 * - UI state is verified via Playwright after the indexer processes events
 */

test.describe('Delegation Flow', () => {
  test('deposit → delegate → spend on project', async ({ page, wallet }) => {
    const { graphqlUrl, delegatableNotesAddress, pubstarterAddress } =
      getContractAddresses()

    if (!delegatableNotesAddress || !pubstarterAddress) {
      throw new Error(
        'Delegation/pubstarter contract addresses not set in ui/.env. ' +
          'Expected VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS and VITE_PUBSTARTER_CONTRACT_ADDRESS.'
      )
    }

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const account0Clients = createE2ETestClients('ACCOUNT_0')
    const account1Clients = createE2ETestClients('ACCOUNT_1')

    const delegatableNotesContract: DelegatableNotesContract = {
      address: delegatableNotesAddress,
      abi: DelegatableNotesAbi,
    }
    const pubstarterContract: PubstarterContract = {
      address: pubstarterAddress,
      abi: PubstarterAbi,
    }

    // Use matching amounts so the note is fully consumed in the purchase
    const tokenPrice = parseEther('0.1')
    const depositAmount = parseEther('0.1')

    // =========================================================================
    // Step 1: Create a pubstarter project (ACCOUNT_0)
    // We need a project to spend the note on
    // =========================================================================
    console.log('\n=== CREATING PROJECT ===')
    const projectMetadata = {
      title: `E2E Delegation Test ${Date.now()}`,
      description: 'Project for delegation flow E2E test',
      category: 'Test',
    }
    const projectMetadataCid = await uploadToIPFS(ipfsConfig, projectMetadata)
    console.log('Project metadata CID:', projectMetadataCid)

    const { projectDetails } = await createProject(
      account0Clients,
      pubstarterContract,
      {
        metadataURI: `ipfs://${projectMetadataCid}/`,
        contractURI: `ipfs://${projectMetadataCid}`,
        owner: account0Clients.account,
        recipient: account0Clients.account,
        threshold: parseEther('10'), // high threshold so project stays active
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days
        projectMetadataCid,
        tokenIds: [0n],
        tokenCounts: [100n],
        tokenPrices: [tokenPrice],
      }
    )
    console.log('Project assurance contract:', projectDetails.assuranceContractAddress)
    console.log('Project token contract:', projectDetails.tokenAddress)

    // =========================================================================
    // Step 2: ACCOUNT_0 deposits ETH as a delegatable note
    // =========================================================================
    console.log('\n=== DEPOSITING ETH ===')
    const { noteId } = await depositETH(account0Clients, delegatableNotesContract, {
      amount: depositAmount,
    })
    console.log('Deposited note ID:', noteId.toString())

    // =========================================================================
    // Step 3: ACCOUNT_0 delegates the full note to ACCOUNT_1
    // =========================================================================
    console.log('\n=== DELEGATING NOTE ===')
    const { delegatedNoteId } = await delegateNote(
      account0Clients,
      delegatableNotesContract,
      {
        noteId,
        owners: [account0Clients.account], // ACCOUNT_0 is the only owner (root = leaf)
        delegateTo: account1Clients.account,
        amount: depositAmount, // full delegation
      }
    )
    console.log('Delegated note ID:', delegatedNoteId.toString())

    // Wait for indexer to process the deposit + delegation events
    await waitForIndexer(graphqlUrl)
    await new Promise((r) => setTimeout(r, 2000))

    // =========================================================================
    // Step 4: Connect as ACCOUNT_1 and verify delegation in UI
    // =========================================================================
    console.log('\n=== VERIFYING DELEGATION IN UI ===')
    await page.goto('/')
    await wallet.connect('ACCOUNT_1')
    await expect(page.getByText(/welcome back/i)).toBeVisible()

    // Navigate to My Notes via header link (client-side nav preserves wallet state)
    await page.locator('header').getByRole('link', { name: 'My Notes' }).click()

    // Verify note appears in "Notes I Control" (ACCOUNT_1 is the leaf owner)
    await expect(page.getByText('Notes I Control')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('0.1 ETH')).toBeVisible({ timeout: 20000 })

    // =========================================================================
    // Step 5: Navigate to note detail page and verify delegation chain
    // =========================================================================
    console.log('\n=== VERIFYING NOTE DETAIL PAGE ===')
    // Navigate directly to note detail (wallet state may reset but chain is shown regardless)
    await page.goto(`/notes/${delegatedNoteId}`)

    // Delegation chain visualization should show root and leaf
    await expect(page.getByText('Delegation Chain')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Root')).toBeVisible()
    await expect(page.getByText('Leaf')).toBeVisible()

    // Note should be active
    await expect(page.getByText('Active')).toBeVisible()

    // =========================================================================
    // Step 6: ACCOUNT_1 spends the delegated note on the project via SDK
    // =========================================================================
    console.log('\n=== SPENDING NOTE ON PROJECT ===')
    await purchaseFromPrimaryMarketWithNotes(
      account1Clients,
      delegatableNotesContract,
      {
        noteIds: [delegatedNoteId],
        chains: [
          [account1Clients.account, account0Clients.account], // leaf first, root last
        ],
        paymentAmount: tokenPrice, // 0.1 ETH for 1 token
        primaryMarket: projectDetails.assuranceContractAddress,
        erc1155Contract: projectDetails.tokenAddress,
        tokenIds: [0n],
        counts: [1n],
      }
    )
    console.log('Note spent on project')

    // Wait for indexer to process the purchase event
    await new Promise((r) => setTimeout(r, 2000))

    // =========================================================================
    // Step 7: Verify the note is now inactive after being spent
    // =========================================================================
    console.log('\n=== VERIFYING NOTE IS INACTIVE ===')
    await page.reload()

    // The note was fully consumed (0.1 ETH = 1 token at 0.1 ETH), so it should be inactive
    await expect(page.getByText('Inactive')).toBeVisible({ timeout: 20000 })

    console.log('Delegation flow E2E test complete!')
  })
})
