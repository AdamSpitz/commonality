import {
  AlignmentAttestationsAbi,
  BeliefsAbi,
  createAndSignStatement,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  createProject,
  createSDKMachinery,
  createStatement,
  MutableRefUpdaterAbi,
  PROJECT_ALIGNMENT_TOPIC,
  ProjectFactoryAbi,
  setTrust,
  toSubjectId,
  TrustRegistryAbi,
  uploadToIPFS,
  attestAlignment,
  waitForIndexerToSyncToBlockNumber,
  waitForIndexerToSyncToTxHash,
  type AlignmentAttestationsContract,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  type ProjectFactoryContract,
  type TrustRegistryContract,
} from '@commonality/sdk'
import { parseUnits } from 'viem'
import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'

const INDEXER_SYNC_TIMEOUT_MS = 60_000

test.describe('Subjectiv Flow', () => {
  test('settings direct trust can be saved from a funding portal scenario', async ({
    page,
    wallet,
  }) => {
    const {
      alignmentAttestationsAddress,
      beliefsAddress,
      mutableRefUpdaterAddress,
      projectFactoryAddress,
      trustRegistryAddress,
      graphqlUrl,
      paymentTokenAddress,
    } = getContractAddresses()

    if (!alignmentAttestationsAddress || !projectFactoryAddress || !trustRegistryAddress) {
      throw new Error(
        'Subjectiv contract addresses not set in ui/.env. ' +
          'Expected VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS, ' +
          'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS, and VITE_TRUST_REGISTRY_CONTRACT_ADDRESS.'
      )
    }

    const uniqueSuffix = Date.now()
    const causeContent = `E2E Subjectiv Cause ${uniqueSuffix}`
    const trustedProjectName = `E2E Trusted Project ${uniqueSuffix}`
    const untrustedProjectName = `E2E Untrusted Project ${uniqueSuffix}`

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(graphqlUrl, ipfsConfig, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })

    const account0Clients = createE2ETestClients('ACCOUNT_0')
    const account1Clients = createE2ETestClients('ACCOUNT_1')
    const account2Clients = createE2ETestClients('ACCOUNT_2')
    const account3Clients = createE2ETestClients('ACCOUNT_3')

    const beliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }
    const mutableRefUpdaterContract: MutableRefUpdaterContract = {
      address: mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
    }
    const alignmentAttestationsContract: AlignmentAttestationsContract = {
      address: alignmentAttestationsAddress,
      abi: AlignmentAttestationsAbi,
    }
    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
    }
    const trustRegistryContract: TrustRegistryContract = {
      address: trustRegistryAddress,
      abi: TrustRegistryAbi,
    }

    console.log('\n=== CREATING SUBJECTIV TEST SCENARIO ===')

    const causeResult = await createAndSignStatement(
      account0Clients,
      {
        beliefs: beliefsContract,
        mutableRefUpdater: mutableRefUpdaterContract,
      },
      createStatement({ content: causeContent }),
      {
        machinery,
        addToCreatedList: true,
      }
    )
    await waitForIndexerToSyncToTxHash(
      machinery,
      account0Clients.publicClient,
      causeResult.signTxHash,
      INDEXER_SYNC_TIMEOUT_MS
    )
    if (causeResult.updateListTxHash) {
      await waitForIndexerToSyncToTxHash(
        machinery,
        account0Clients.publicClient,
        causeResult.updateListTxHash,
        INDEXER_SYNC_TIMEOUT_MS
      )
    }

    const trustedProjectMetadataCid = await uploadToIPFS(ipfsConfig, {
      name: trustedProjectName,
      description: 'Project aligned by an account reached through the trust network',
    })
    const untrustedProjectMetadataCid = await uploadToIPFS(ipfsConfig, {
      name: untrustedProjectName,
      description: 'Project aligned only by an untrusted attester',
    })

    const trustedProject = await createProject(account2Clients, projectFactoryContract, {
      metadataURI: `ipfs://${trustedProjectMetadataCid}/`,
      contractURI: `ipfs://${trustedProjectMetadataCid}`,
      owner: account2Clients.account,
      recipient: account2Clients.account,
      paymentToken: paymentTokenAddress!,
      threshold: parseUnits('10', 6),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
      projectMetadataCid: trustedProjectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [parseUnits('0.1', 6)],
    })
    await waitForIndexerToSyncToTxHash(
      machinery,
      account2Clients.publicClient,
      trustedProject.hash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    const untrustedProject = await createProject(account3Clients, projectFactoryContract, {
      metadataURI: `ipfs://${untrustedProjectMetadataCid}/`,
      contractURI: `ipfs://${untrustedProjectMetadataCid}`,
      owner: account3Clients.account,
      recipient: account3Clients.account,
      paymentToken: paymentTokenAddress!,
      threshold: parseUnits('10', 6),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
      projectMetadataCid: untrustedProjectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [parseUnits('0.1', 6)],
    })
    await waitForIndexerToSyncToTxHash(
      machinery,
      account3Clients.publicClient,
      untrustedProject.hash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    const trustedAlignmentHash = await attestAlignment(
      account2Clients,
      alignmentAttestationsContract,
      toSubjectId(trustedProject.projectDetails.assuranceContractAddress),
      causeResult.cid,
      PROJECT_ALIGNMENT_TOPIC
    )
    await waitForIndexerToSyncToTxHash(
      machinery,
      account2Clients.publicClient,
      trustedAlignmentHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    const untrustedAlignmentHash = await attestAlignment(
      account3Clients,
      alignmentAttestationsContract,
      toSubjectId(untrustedProject.projectDetails.assuranceContractAddress),
      causeResult.cid,
      PROJECT_ALIGNMENT_TOPIC
    )
    await waitForIndexerToSyncToTxHash(
      machinery,
      account3Clients.publicClient,
      untrustedAlignmentHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    const account1TrustHash = await setTrust(
      account1Clients,
      trustRegistryContract,
      account2Clients.account,
      100
    )
    await waitForIndexerToSyncToTxHash(
      machinery,
      account1Clients.publicClient,
      account1TrustHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    console.log('\n=== VERIFYING FUNDING PORTAL BEFORE TRUST ===')
    await page.goto('/start')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    await page.goto(`/portal/${causeResult.cid}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('button', { name: /0xf39f/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: trustedProjectName })).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole('heading', { name: untrustedProjectName })).toBeVisible({
      timeout: 20000,
    })

    console.log('\n=== ADDING DIRECT TRUST IN SETTINGS ===')
    await page.locator('header').getByRole('button', { name: 'More' }).click()
    await page.getByRole('menuitem', { name: 'Trust & Nudger Settings' }).click()
    await expect(page.getByRole('heading', { name: 'Trust Settings' })).toBeVisible()
    const trustSection = page.getByRole('heading', { name: 'Your Trust Network' }).locator('..')

    await trustSection.getByRole('textbox', { name: 'Wallet Address' }).fill(account1Clients.account)
    await trustSection.getByRole('spinbutton', { name: 'Score' }).fill('100')
    await trustSection.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Direct trust updated')).toBeVisible()
    const latestBlockNumber = await account0Clients.publicClient.getBlockNumber()
    await waitForIndexerToSyncToBlockNumber(
      machinery,
      latestBlockNumber,
      INDEXER_SYNC_TIMEOUT_MS
    )

    await trustSection.getByRole('button', { name: 'Refresh Network' }).click()

    console.log('\n=== VERIFYING PORTAL RELOAD AFTER TRUST UPDATE ===')
    await page.goto(`/portal/${causeResult.cid}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('button', { name: /0xf39f/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: trustedProjectName })).toBeVisible({
      timeout: 20000,
    })
    await expect(page.getByRole('heading', { name: untrustedProjectName })).toBeVisible({
      timeout: 20000,
    })
  })
})
