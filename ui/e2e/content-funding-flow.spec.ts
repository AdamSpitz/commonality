import {
  CreatorAssuranceContractFactoryAbi,
  buildCanonicalChannelId,
  createContentFundingContract,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  createSDKMachinery,
  uploadToIPFS,
  waitForIndexerToSyncToTxHash,
} from '@commonality/sdk'
import { parseEther } from 'viem'
import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'

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
        initialPurchaseTokenIds: [],
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
})
