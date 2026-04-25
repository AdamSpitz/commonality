import {
  AssuranceContractAbi,
  ChannelRegistryAbi,
  CreatorAssuranceContractFactoryAbi,
  DelegatableNotesAbi,
  buildCanonicalChannelId,
  createContentFundingContract,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  createSDKMachinery,
  depositERC20,
  getThirdPartyMinPurchase,
  hashCanonicalId,
  purchaseFromPrimaryMarketWithNotes,
  takeChannelControl,
  uploadToIPFS,
  waitForIndexerToSyncToTxHash,
} from '@commonality/sdk'
import { parseEther, keccak256, stringToBytes } from 'viem'
import { test, expect } from './fixtures/wallet'
import {
  createE2ETestClients,
  getContractAddresses,
  verifyE2EChannelOwnership,
} from './utils/blockchain'

const INDEXER_SYNC_TIMEOUT_MS = 60_000

test.describe('Content Funding Flow', () => {
  test('creator contract appears on the Browse Creators page after creation', async ({ page }) => {
    const {
      creatorContractFactoryAddress,
      graphqlUrl,
    } = getContractAddresses()

    if (!creatorContractFactoryAddress) {
      throw new Error(
        'Content-funding contract addresses not set in ui/.env. ' +
          'Expected VITE_CREATOR_CONTRACT_FACTORY_ADDRESS.'
      )
    }

    // Use timestamp-derived IDs to avoid collisions across test runs
    const uniqueSuffix = Date.now()
    const channelUid = String(uniqueSuffix)
    const channelCanonicalId = buildCanonicalChannelId('twitter', channelUid)
    // Tweet IDs are also pure digits; use a different value from the UID
    const tweetId = String(uniqueSuffix + 1)

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(graphqlUrl, ipfsConfig, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })

    const account0Clients = createE2ETestClients('ACCOUNT_0')

    // Upload minimal project metadata to IPFS so the contract has a valid CID
    const metadataCid = await uploadToIPFS(ipfsConfig, {
      name: `E2E Test Creator ${uniqueSuffix}`,
      description: 'E2E test content-funding contract',
    })

    console.log('\n=== CREATING CONTENT FUNDING CONTRACT ===')
    console.log(`  channelCanonicalId: ${channelCanonicalId}`)
    console.log(`  tweetId: ${tweetId}`)

    console.log('\n=== VERIFYING CHANNEL OWNERSHIP ===')
    await verifyE2EChannelOwnership(account0Clients, channelCanonicalId)

    const { hash } = await createContentFundingContract(
      account0Clients,
      { address: creatorContractFactoryAddress, abi: CreatorAssuranceContractFactoryAbi },
      {
        channelCanonicalId,
        contentUrls: [`https://twitter.com/testaccount/status/${tweetId}`],
        contentSupplies: [100n],
        contentPrices: [parseEther('0.01')],
        threshold: parseEther('1'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
        metadataCid,
        erc1155MetadataUri: `ipfs://${metadataCid}/`,
        erc1155ContractUri: `ipfs://${metadataCid}`,
        isThirdParty: false,
        initialPurchaseIndices: [],
        initialPurchaseCounts: [],
      }
    )

    console.log(`  tx hash: ${hash}`)

    await waitForIndexerToSyncToTxHash(
      machinery,
      account0Clients.publicClient,
      hash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    console.log('\n=== VERIFYING BROWSE CREATORS PAGE ===')
    await page.goto('/content/twitter')

    // Twitter channel display name is "@{stableId}" where stableId is the numeric UID
    const displayName = `@${channelUid}`
    await expect(page.getByText(displayName)).toBeVisible({ timeout: 20000 })
  })

  test('full creator/supporter loop: third-party contract → claim → dashboard → withdraw', async ({ page, wallet }) => {
    const {
      creatorContractFactoryAddress,
      channelRegistryAddress,
      delegatableNotesAddress,
      paymentTokenAddress,
      graphqlUrl,
    } = getContractAddresses()

    if (!creatorContractFactoryAddress || !channelRegistryAddress) {
      throw new Error(
        'Content-funding contract addresses not set in ui/.env. ' +
          'Expected VITE_CREATOR_CONTRACT_FACTORY_ADDRESS and VITE_CHANNEL_REGISTRY_ADDRESS.'
      )
    }
    if (!delegatableNotesAddress || !paymentTokenAddress) {
      throw new Error(
        'Delegation contract addresses not set in ui/.env. ' +
          'Expected VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS and VITE_PAYMENT_TOKEN_ADDRESS.'
      )
    }

    const uniqueSuffix = Date.now()
    const channelUid = String(uniqueSuffix)
    const channelCanonicalId = buildCanonicalChannelId('twitter', channelUid)
    const tweetId = String(uniqueSuffix + 1)
    const contentSuffix = tweetId
    const contentCanonicalId = `${channelCanonicalId}:${contentSuffix}`
    const contentId = BigInt(keccak256(stringToBytes(contentCanonicalId)))

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(graphqlUrl, ipfsConfig, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })

    const account0Clients = createE2ETestClients('ACCOUNT_0')
    const account1Clients = createE2ETestClients('ACCOUNT_1')

    const factoryContract = { address: creatorContractFactoryAddress, abi: CreatorAssuranceContractFactoryAbi }
    const registryContract = { address: channelRegistryAddress, abi: ChannelRegistryAbi }
    const notesContract = { address: delegatableNotesAddress, abi: DelegatableNotesAbi }

    // =========================================================================
    // Step 1: ACCOUNT_0 verifies the channel (becomes the verified owner)
    // =========================================================================
    console.log('\n=== STEP 1: VERIFYING CHANNEL OWNERSHIP ===')
    await verifyE2EChannelOwnership(account0Clients, channelCanonicalId)
    console.log(`  Channel verified: ${channelCanonicalId}`)

    // =========================================================================
    // Step 2: ACCOUNT_1 creates a third-party contract for the channel
    // =========================================================================
    console.log('\n=== STEP 2: CREATING THIRD-PARTY CONTRACT ===')
    const metadataCid = await uploadToIPFS(ipfsConfig, {
      name: `E2E Third-Party Creator ${uniqueSuffix}`,
      description: 'E2E test third-party content-funding contract',
    })

    const minPurchase = await getThirdPartyMinPurchase(account1Clients, factoryContract)
    console.log(`  Minimum purchase for third-party: ${minPurchase}`)

    const contentPrice = parseEther('0.01')
    const purchaseCount = minPurchase / contentPrice + 1n

    const { hash: createHash, contractDetails } = await createContentFundingContract(
      account1Clients,
      factoryContract,
      {
        channelCanonicalId,
        contentUrls: [`https://twitter.com/testaccount/status/${tweetId}`],
        contentSupplies: [100n],
        contentPrices: [contentPrice],
        threshold: parseEther('0.1'),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
        metadataCid,
        erc1155MetadataUri: `ipfs://${metadataCid}/`,
        erc1155ContractUri: `ipfs://${metadataCid}`,
        isThirdParty: true,
        initialPurchaseIndices: [0n],
        initialPurchaseCounts: [purchaseCount],
      }
    )
    console.log(`  Third-party contract created: ${contractDetails.contractAddress}`)
    console.log(`  Initial purchase: ${purchaseCount} tokens`)

    await waitForIndexerToSyncToTxHash(
      machinery,
      account1Clients.publicClient,
      createHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    // =========================================================================
    // Step 3: Verify the third-party contract appears on the browse page
    // =========================================================================
    console.log('\n=== STEP 3: VERIFYING CONTRACT ON BROWSE PAGE ===')
    await page.goto('/content/twitter')
    const displayName = `@${channelUid}`
    await expect(page.getByText(displayName)).toBeVisible({ timeout: 20000 })
    console.log('  Contract visible on browse page')

    // =========================================================================
    // Step 4: ACCOUNT_0 takes control of the channel (enables veto window)
    // =========================================================================
    console.log('\n=== STEP 4: TAKING CHANNEL CONTROL ===')
    const { hash: controlHash } = await takeChannelControl(
      account0Clients,
      registryContract,
      hashCanonicalId(channelCanonicalId),
    )
    console.log(`  Channel control taken: ${controlHash}`)

    await waitForIndexerToSyncToTxHash(
      machinery,
      account0Clients.publicClient,
      controlHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    // =========================================================================
    // Step 5: Connect as ACCOUNT_0 and view the contract in the dashboard
    // =========================================================================
    console.log('\n=== STEP 5: VIEWING CONTRACT IN DASHBOARD ===')
    await page.goto('/start')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    // Navigate to creator dashboard
    await page.locator('header').getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Creator Dashboard' }).click()

    // Dashboard should show the channel
    await expect(page.getByText(displayName)).toBeVisible({ timeout: 20000 })
    console.log('  Channel visible in creator dashboard')

    // Navigate to the contract detail page
    await page.goto(`/content/twitter/${encodeURIComponent(channelCanonicalId)}`)
    await expect(page.getByText(/Fan-created/i)).toBeVisible({ timeout: 20000 })
    console.log('  Contract detail shows Fan-created chip')

    // =========================================================================
    // Step 6: Another supporter (ACCOUNT_1) purchases more tokens
    // =========================================================================
    console.log('\n=== STEP 6: ADDITIONAL SUPPORTER PURCHASE ===')
    const { noteId } = await depositERC20(account1Clients, notesContract, {
      token: paymentTokenAddress,
      amount: parseEther('0.5'),
    })
    console.log(`  Deposited note ID: ${noteId.toString()}`)

    const additionalPurchaseCount = 9n
    const purchaseHash = await purchaseFromPrimaryMarketWithNotes(
      account1Clients,
      notesContract,
      {
        noteIds: [noteId],
        chains: [[account1Clients.account]],
        paymentAmount: contentPrice * additionalPurchaseCount,
        primaryMarket: contractDetails.contractAddress,
        erc1155Contract: contractDetails.erc1155Address,
        tokenIds: [contentId],
        counts: [additionalPurchaseCount],
      }
    )
    console.log(`  Additional purchase tx: ${purchaseHash}`)

    await waitForIndexerToSyncToTxHash(
      machinery,
      account1Clients.publicClient,
      purchaseHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    // =========================================================================
    // Step 7: ACCOUNT_0 withdraws from the successful creator contract
    // =========================================================================
    console.log('\n=== STEP 7: WITHDRAWING FROM CREATOR CONTRACT ===')
    const withdrawHash = await account0Clients.walletClient.writeContract({
      address: contractDetails.contractAddress,
      abi: AssuranceContractAbi,
      functionName: 'withdraw',
      chain: account0Clients.walletClient.chain,
      account: account0Clients.walletClient.account!,
    })
    await account0Clients.publicClient.waitForTransactionReceipt({ hash: withdrawHash })
    console.log(`  Withdrawal tx: ${withdrawHash}`)

    await waitForIndexerToSyncToTxHash(
      machinery,
      account0Clients.publicClient,
      withdrawHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    // =========================================================================
    // Step 8: Verify the withdrawal is reflected in the dashboard
    // =========================================================================
    console.log('\n=== STEP 8: VERIFYING WITHDRAWAL IN DASHBOARD ===')
    await page.reload()
    await expect(page.getByText(/Fan-created/i)).toBeVisible({ timeout: 20000 })

    await expect(page.getByRole('link', { name: /Fan-created.*1 item/i })).toBeVisible({ timeout: 10000 })
    console.log('  Contract still visible after withdrawal')

    console.log('\n=== FULL CREATOR/SUPPORTER LOOP COMPLETE ===')
  })
})
