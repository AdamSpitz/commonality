import { test, expect } from './fixtures/wallet'
import { createE2EWriteClients, getContractAddresses } from './utils/blockchain'
import { waitForProject } from './utils/indexer'
import {
  DelegatableNotesAbi,
  ProjectFactoryAbi,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  createProject,
  createSDKMachinery,
  depositERC20,
  uploadToIPFS,
  waitForIndexerToSyncToTxHash,
  type DelegatableNotesContract,
  type ProjectFactoryContract,
} from '@commonality/sdk'
import { parseUnits } from 'viem'

const INDEXER_SYNC_TIMEOUT_MS = 60_000

/**
 * Negative-path browser tests for user-facing failures and invalid actions.
 * These complement the happy-path E2E specs by checking that broken links,
 * missing chain data, and insufficient funding inputs fail clearly instead of
 * leaving the user on a spinner or a silent no-op.
 *
 * Statement-route tests run against the tally domain (owns /statement/:cid).
 * Project-route tests run against the commonality domain (owns /projects/:addr).
 */

test.describe('Negative paths — statement routes (tally)', () => {
  test('nonexistent statement route shows a not-found error', async ({ page }) => {
    await page.goto('/statement/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku')

    await expect(page.getByRole('heading', { name: /^statement$/i })).toBeVisible()
    await expect(page.getByText('Statement not found')).toBeVisible({ timeout: 20_000 })
  })
})

test.describe('Negative paths — project routes (commonality)', () => {
  test.use({ baseURL: 'http://localhost:5174' })

  test('nonexistent project route shows a not-found error', async ({ page }) => {
    await page.goto('/projects/0x000000000000000000000000000000000000dEaD')

    await expect(page.getByText('Project not found')).toBeVisible({ timeout: 20_000 })
  })

  test('buying with a delegatable note larger than its balance is blocked before submit', async ({
    page,
    wallet,
  }) => {
    const { graphqlUrl, delegatableNotesAddress, projectFactoryAddress, paymentTokenAddress } =
      getContractAddresses()

    if (!delegatableNotesAddress || !projectFactoryAddress || !paymentTokenAddress) {
      throw new Error(
        'Negative-path note purchase test requires delegatable notes, lazyGiving, and payment token addresses in ui/.env.'
      )
    }

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(ipfsConfig, {}, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })
    const clients = createE2EWriteClients('ACCOUNT_0')
    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
    }
    const delegatableNotesContract: DelegatableNotesContract = {
      address: delegatableNotesAddress,
      abi: DelegatableNotesAbi,
    }

    const tokenPrice = parseUnits('0.1', 6)
    const projectName = `E2E Negative Note Balance ${Date.now()}`
    const projectMetadataCid = await uploadToIPFS(ipfsConfig, {
      name: projectName,
      description: 'Created by negative-path E2E test',
    })

    const { projectDetails } = await createProject(clients, projectFactoryContract, {
      metadataURI: `ipfs://${projectMetadataCid}/`,
      contractURI: `ipfs://${projectMetadataCid}`,
      owner: clients.account,
      recipient: clients.account,
      paymentToken: paymentTokenAddress,
      threshold: parseUnits('10', 6),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [tokenPrice],
    })

    const { hash: noteHash } = await depositERC20(clients, delegatableNotesContract, {
      token: paymentTokenAddress,
      amount: parseUnits('0.05', 6),
    })

    await waitForProject(graphqlUrl, projectDetails.assuranceContractAddress)
    await waitForIndexerToSyncToTxHash(
      machinery,
      clients.publicClient,
      noteHash,
      INDEXER_SYNC_TIMEOUT_MS
    )

    await page.goto(`/projects/${projectDetails.assuranceContractAddress}`)
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('heading', { name: /buy tokens/i })).toBeVisible({ timeout: 20_000 })

    await page.getByLabel('Fund with delegatable note').check()
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: /note #/i }).first().click()
    await page.getByRole('spinbutton', { name: /quantity/i }).fill('1')

    await expect(page.getByText(/exceeds note balance/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /buy with note/i })).toBeDisabled()
  })
})
