import { expect } from '@playwright/test'
import { test } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import {
  AssuranceContractAbi,
  BeliefsAbi,
  DelegatableNotesAbi,
  MutableRefUpdaterAbi,
  PubstarterAbi,
  buyProjectTokens,
  createAndSignStatement,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  createProject,
  createSDKMachinery,
  createStatement,
  delegateNote,
  depositERC20,
  uploadToIPFS,
  waitForIndexerToSyncToTxHash,
  type AssuranceContract,
  type BeliefsContract,
  type DelegatableNotesContract,
  type MutableRefUpdaterContract,
  type PubstarterContract,
} from '@commonality/sdk'
import { parseEther } from 'viem'
import { waitForProject, waitForStatement } from './utils/indexer'

const INDEXER_SYNC_TIMEOUT_MS = 60_000

test.describe('Pre-testnet smoke test', () => {
  test('core flows work without browser console errors', async ({ page, wallet }) => {
    const browserErrors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') {
        browserErrors.push(message.text())
      }
    })
    page.on('pageerror', (error) => browserErrors.push(error.message))

    const {
      beliefsAddress,
      mutableRefUpdaterAddress,
      graphqlUrl,
      delegatableNotesAddress,
      pubstarterAddress,
      paymentTokenAddress,
    } = getContractAddresses()

    if (!delegatableNotesAddress || !pubstarterAddress || !paymentTokenAddress) {
      throw new Error(
        'Pre-testnet smoke test requires delegatable notes, pubstarter, and payment token addresses in ui/.env.'
      )
    }

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const machinery = createSDKMachinery(graphqlUrl, ipfsConfig, {}, {
      areWeJustRunningTests: true,
      shouldTestsBeVerbose: false,
    })
    const account0Clients = createE2ETestClients('ACCOUNT_0')
    const account1Clients = createE2ETestClients('ACCOUNT_1')

    const beliefsContract: BeliefsContract = {
      address: beliefsAddress,
      abi: BeliefsAbi,
    }
    const mutableRefContract: MutableRefUpdaterContract = {
      address: mutableRefUpdaterAddress,
      abi: MutableRefUpdaterAbi,
    }
    const pubstarterContract: PubstarterContract = {
      address: pubstarterAddress,
      abi: PubstarterAbi,
    }
    const delegatableNotesContract: DelegatableNotesContract = {
      address: delegatableNotesAddress,
      abi: DelegatableNotesAbi,
    }

    await page.goto('/start')
    await wallet.connect('ACCOUNT_0')
    await expect(page.getByText(/ready to take the next step/i)).toBeVisible()

    await test.step('browse statements and create/believe a statement', async () => {
      await page.goto('/statements')
      await expect(page.getByRole('heading', { name: /statements/i })).toBeVisible()

      const statementContent = `Pre-testnet smoke statement ${Date.now()}`
      const statementData = createStatement({ content: statementContent })
      const statementResult = await createAndSignStatement(
        account0Clients,
        { beliefs: beliefsContract, mutableRefUpdater: mutableRefContract },
        statementData,
        { machinery, addToCreatedList: false }
      )

      await waitForStatement(graphqlUrl, statementResult.cid)
      await page.goto('/statements')
      await expect(page.getByText(statementContent).first()).toBeVisible({
        timeout: 20_000,
      })
    })

    let projectAddress: `0x${string}`
    await test.step('browse projects and fund a project', async () => {
      await page.goto('/projects')
      await expect(page.getByRole('heading', { name: /projects/i })).toBeVisible()

      const tokenPrice = parseEther('0.1')
      const projectName = `Pre-testnet smoke project ${Date.now()}`
      const projectMetadataCid = await uploadToIPFS(ipfsConfig, {
        name: projectName,
        description: 'Created by the pre-testnet smoke test',
      })

      const { projectDetails } = await createProject(
        account0Clients,
        pubstarterContract,
        {
          metadataURI: `ipfs://${projectMetadataCid}/`,
          contractURI: `ipfs://${projectMetadataCid}`,
          owner: account0Clients.account,
          recipient: account0Clients.account,
          paymentToken: paymentTokenAddress,
          threshold: parseEther('10'),
          deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
          projectMetadataCid,
          tokenIds: [0n],
          tokenCounts: [100n],
          tokenPrices: [tokenPrice],
        }
      )
      projectAddress = projectDetails.assuranceContractAddress

      const assuranceContract: AssuranceContract = {
        address: projectDetails.assuranceContractAddress,
        abi: AssuranceContractAbi,
      }
      const purchaseHash = await buyProjectTokens(account1Clients, assuranceContract, {
        buyer: account1Clients.account,
        tokenAddress: projectDetails.tokenAddress,
        tokenIds: [0n],
        tokenCounts: [5n],
        totalCost: tokenPrice * 5n,
      })

      await waitForProject(graphqlUrl, projectDetails.assuranceContractAddress)
      await waitForIndexerToSyncToTxHash(
        machinery,
        account1Clients.publicClient,
        purchaseHash,
        INDEXER_SYNC_TIMEOUT_MS
      )

      await page.goto('/projects')
      await expect(page.getByText(projectName)).toBeVisible({ timeout: 20_000 })
      await page.goto(`/projects/${projectDetails.assuranceContractAddress}`)
      await expect(page.getByText(/ETH raised/i)).toBeVisible({ timeout: 20_000 })
      await expect(page.getByText('0.5 ETH').first()).toBeVisible({ timeout: 20_000 })
    })

    await test.step('delegate funds and see them in the UI', async () => {
      const depositAmount = parseEther('0.1')
      const { noteId } = await depositERC20(account0Clients, delegatableNotesContract, {
        token: paymentTokenAddress,
        amount: depositAmount,
      })
      const { hash: delegationHash } = await delegateNote(
        account0Clients,
        delegatableNotesContract,
        {
          noteId,
          owners: [account0Clients.account],
          delegateTo: account1Clients.account,
          amount: depositAmount,
        }
      )

      await waitForIndexerToSyncToTxHash(
        machinery,
        account0Clients.publicClient,
        delegationHash,
        INDEXER_SYNC_TIMEOUT_MS
      )

      await page.goto('/start')
      await wallet.connect('ACCOUNT_1')
      await expect(page.getByText(/ready to take the next step/i)).toBeVisible()
      await page.locator('header').getByRole('button', { name: 'More' }).click()
      await page.getByRole('menuitem', { name: 'My Delegated Funds' }).click()

      await expect(page.getByText('Funds I Control')).toBeVisible({ timeout: 20_000 })
      await expect(
        page.getByRole('link', { name: /Fund #\d+.*Delegated from 0xf39F/i }).first()
      ).toBeVisible({ timeout: 20_000 })
    })

    await expect(page.locator('body')).toBeVisible()
    expect(projectAddress!).toMatch(/^0x[0-9a-fA-F]{40}$/)
    expect(browserErrors).toEqual([])
  })
})
