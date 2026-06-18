import { execSync } from 'child_process'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
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
  toSubjectId,
  uploadToIPFS,
  attestAlignment,
  waitForIndexerToSyncToTxHash,
  type AlignmentAttestationsContract,
  type BeliefsContract,
  type MutableRefUpdaterContract,
  type ProjectFactoryContract,
} from '@commonality/sdk'
import { expect, test } from './fixtures/wallet'
import { createE2EWriteClients, getContractAddresses } from './utils/blockchain'
import { waitForEventCacheApi, waitForIndexer } from './utils/indexer'
import { parseUnits } from 'viem'

const INDEXER_SYNC_TIMEOUT_MS = 60_000

function projectRoot(): string {
  const __filename = fileURLToPath(import.meta.url)
  return resolve(dirname(__filename), '../..')
}

async function restartIndexerAndWait(graphqlUrl: string): Promise<void> {
  execSync('docker-compose restart indexer', {
    cwd: projectRoot(),
    stdio: 'inherit',
    env: { ...process.env, PONDER_EPHEMERAL: 'true' },
  })
  await expect
    .poll(async () => waitForIndexer(graphqlUrl, 1, 100), {
      timeout: INDEXER_SYNC_TIMEOUT_MS,
      intervals: [1000],
      message: 'indexer should become ready after restart',
    })
    .toBe(true)
  await expect
    .poll(async () => waitForEventCacheApi(graphqlUrl, 1, 100), {
      timeout: INDEXER_SYNC_TIMEOUT_MS,
      intervals: [1000],
      message: 'event cache API should become ready after restart',
    })
    .toBe(true)
}

test.describe('Cross-domain persistence', () => {
  test('project, statement, and alignment attestation survive an indexer restart and stay consistent in UI', async ({
    page,
    wallet,
  }) => {
    const {
      alignmentAttestationsAddress,
      beliefsAddress,
      mutableRefUpdaterAddress,
      projectFactoryAddress,
      graphqlUrl,
      paymentTokenAddress,
    } = getContractAddresses()

    if (!alignmentAttestationsAddress || !projectFactoryAddress || !paymentTokenAddress) {
      throw new Error('Cross-domain persistence e2e requires alignment, project factory, and payment token addresses')
    }

    const uniqueSuffix = Date.now()
    const causeContent = `E2E Persistent Cause ${uniqueSuffix}`
    const projectName = `E2E Persistent Project ${uniqueSuffix}`

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(ipfsConfig, undefined, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })
    const creatorClients = createE2EWriteClients('ACCOUNT_0')
    const attesterClients = createE2EWriteClients('ACCOUNT_1')

    const beliefsContract: BeliefsContract = { address: beliefsAddress, abi: BeliefsAbi }
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

    const causeResult = await createAndSignStatement(
      creatorClients,
      { beliefs: beliefsContract, mutableRefUpdater: mutableRefUpdaterContract },
      createStatement({ content: causeContent }),
      { machinery, addToCreatedList: true }
    )
    await waitForIndexerToSyncToTxHash(
      machinery,
      creatorClients.publicClient,
      causeResult.signTxHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    const projectMetadataCid = await uploadToIPFS(ipfsConfig, {
      name: projectName,
      description: 'A project used by the cross-domain persistence e2e test.',
    })
    const project = await createProject(creatorClients, projectFactoryContract, {
      metadataURI: `ipfs://${projectMetadataCid}/`,
      contractURI: `ipfs://${projectMetadataCid}`,
      owner: creatorClients.account,
      recipient: creatorClients.account,
      paymentToken: paymentTokenAddress,
      threshold: parseUnits('10', 6),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [parseUnits('0.1', 6)],
    })
    await waitForIndexerToSyncToTxHash(
      machinery,
      creatorClients.publicClient,
      project.hash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    const alignmentHash = await attestAlignment(
      attesterClients,
      alignmentAttestationsContract,
      toSubjectId(project.projectDetails.assuranceContractAddress),
      causeResult.cid,
      PROJECT_ALIGNMENT_TOPIC
    )
    await waitForIndexerToSyncToTxHash(
      machinery,
      attesterClients.publicClient,
      alignmentHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    await page.goto(`/portal/${causeResult.cid}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 20_000 })

    await page.goto(`http://localhost:5174/projects/${project.projectDetails.assuranceContractAddress}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: 'Project Endorsements' })).toBeVisible()
    await expect(page.getByRole('link', { name: new RegExp(causeResult.cid.slice(0, 12)) })).toBeVisible({ timeout: 20_000 })

    // Move away from the app before deliberately restarting the indexer so
    // route-level polling does not report expected transient 500s as browser
    // console failures.
    await page.goto('about:blank')
    await restartIndexerAndWait(graphqlUrl)
    await waitForIndexerToSyncToTxHash(
      machinery,
      attesterClients.publicClient,
      alignmentHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    await page.goto(`/portal/${causeResult.cid}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 20_000 })

    await page.goto(`http://localhost:5174/projects/${project.projectDetails.assuranceContractAddress}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('link', { name: new RegExp(causeResult.cid.slice(0, 12)) })).toBeVisible({ timeout: 20_000 })
  })
})
