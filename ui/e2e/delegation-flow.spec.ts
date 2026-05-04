import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import {
  DelegatableNotesAbi,
  ProjectFactoryAbi,
  createSDKMachinery,
  depositERC20,
  delegateNote,
  purchaseFromPrimaryMarketWithNotes,
  createProject,
  uploadToIPFS,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  waitForIndexerToSyncToTxHash,
  type DelegatableNotesContract,
  type ProjectFactoryContract,
} from '@commonality/sdk'
import { parseEther } from 'viem'

const INDEXER_SYNC_TIMEOUT_MS = 60_000

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
    const { graphqlUrl, delegatableNotesAddress, projectFactoryAddress, paymentTokenAddress } =
      getContractAddresses()

    if (!delegatableNotesAddress || !projectFactoryAddress) {
      throw new Error(
        'Delegation/pubstarter contract addresses not set in ui/.env. ' +
          'Expected VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS and VITE_PROJECT_FACTORY_CONTRACT_ADDRESS.'
      )
    }

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(graphqlUrl, ipfsConfig, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })
    const account0Clients = createE2ETestClients('ACCOUNT_0')
    const account1Clients = createE2ETestClients('ACCOUNT_1')

    const delegatableNotesContract: DelegatableNotesContract = {
      address: delegatableNotesAddress,
      abi: DelegatableNotesAbi,
    }
    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
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
      projectFactoryContract,
      {
        metadataURI: `ipfs://${projectMetadataCid}/`,
        contractURI: `ipfs://${projectMetadataCid}`,
        owner: account0Clients.account,
        recipient: account0Clients.account,
        paymentToken: paymentTokenAddress!,
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
    const { noteId } = await depositERC20(account0Clients, delegatableNotesContract, {
      token: paymentTokenAddress!,
      amount: depositAmount,
    })
    console.log('Deposited note ID:', noteId.toString())

    // =========================================================================
    // Step 3: ACCOUNT_0 delegates the full note to ACCOUNT_1
    // =========================================================================
    console.log('\n=== DELEGATING NOTE ===')
    const { hash: delegationHash, delegatedNoteId } = await delegateNote(
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
    await waitForIndexerToSyncToTxHash(
      machinery,
      account0Clients.publicClient,
      delegationHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    // =========================================================================
    // Step 4: Connect as ACCOUNT_1 and verify delegation in UI
    // =========================================================================
    console.log('\n=== VERIFYING DELEGATION IN UI ===')
    await page.goto('/')
    await wallet.connect('ACCOUNT_1')

    // Navigate to the delegated funds page via the primary nav.
    await page.getByRole('link', { name: 'Delegated Funds', exact: true }).click()

    // Verify the delegated fund appears in the current controlled-funds section.
    await expect(page.getByText('Funds I Control')).toBeVisible({ timeout: 20000 })
    await expect(
      page.getByRole('link', {
        name: /Fund #\d+.*Delegated from 0xf39F/i,
      }).first()
    ).toBeVisible({ timeout: 20000 })

    // =========================================================================
    // Step 5: Navigate to note detail page and verify delegation chain
    // =========================================================================
    console.log('\n=== VERIFYING NOTE DETAIL PAGE ===')
    // Navigate directly to note detail (wallet state may reset but chain is shown regardless)
    await page.goto(`/notes/${delegatedNoteId}`)

    // Delegation access visualization should show root and leaf.
    await expect(page.getByText('Who Has Access')).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Root', { exact: true })).toBeVisible()
    await expect(page.getByText('Leaf')).toBeVisible()

    // Note should be active
    await expect(page.getByText('Active')).toBeVisible()

    // =========================================================================
    // Step 6: ACCOUNT_1 spends the delegated note on the project via SDK
    // =========================================================================
    console.log('\n=== SPENDING NOTE ON PROJECT ===')
    const purchaseHash = await purchaseFromPrimaryMarketWithNotes(
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
    await waitForIndexerToSyncToTxHash(
      machinery,
      account1Clients.publicClient,
      purchaseHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

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
