import { test, expect } from './fixtures/wallet'
import { createE2ETestClients, getContractAddresses } from './utils/blockchain'
import { waitForProject } from './utils/indexer'
import {
  AssuranceContractAbi,
  ProjectFactoryAbi,
  createProject,
  buyProjectTokens,
  uploadToIPFS,
  createIPFSConfigInNodeJSFromTheUsualEnvVars,
  type ProjectFactoryContract,
  type AssuranceContract,
} from '@commonality/sdk'
import { parseUnits } from 'viem'

/**
 * E2E tests for the LazyGiving (crowdfunding) subsystem.
 *
 * Strategy (same as other E2E tests):
 * - All blockchain transactions via SDK directly (bypasses wagmi's signing limitations)
 * - UI state is verified via Playwright after the indexer processes events
 */

test.describe('LazyGiving Flow', () => {
  test('created project appears on browse page', async ({ page, wallet }) => {
    const { graphqlUrl, projectFactoryAddress, paymentTokenAddress } = getContractAddresses()

    if (!projectFactoryAddress) {
      throw new Error(
        'ProjectFactory contract address not set in ui/.env. ' +
          'Expected VITE_PROJECT_FACTORY_CONTRACT_ADDRESS.'
      )
    }

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const clients = createE2ETestClients('ACCOUNT_0')

    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
    }

    // Create a project with a unique name so we can find it later
    const projectName = `E2E Browse Test ${Date.now()}`
    console.log('\n=== CREATING PROJECT ===')
    const projectMetadataCid = await uploadToIPFS(ipfsConfig, {
      name: projectName,
      description: 'Created by lazyGiving E2E test',
    })
    console.log('Project metadata CID:', projectMetadataCid)

    const { projectDetails } = await createProject(clients, projectFactoryContract, {
      metadataURI: `ipfs://${projectMetadataCid}/`,
      contractURI: `ipfs://${projectMetadataCid}`,
      owner: clients.account,
      recipient: clients.account,
      paymentToken: paymentTokenAddress!,
      threshold: parseUnits('10', 6),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [parseUnits('0.1', 6)],
    })
    console.log('Project assurance contract:', projectDetails.assuranceContractAddress)

    // Wait for the indexer to process the project creation event
    await waitForProject(graphqlUrl, projectDetails.assuranceContractAddress)

    // Connect wallet and navigate to browse projects page
    await page.goto('/projects')
    await wallet.connect('ACCOUNT_0')

    // The project name should appear in the list
    // The UI fetches IPFS metadata client-side, so allow up to 20s for it to load
    await expect(page.getByText(projectName)).toBeVisible({ timeout: 20000 })
    console.log('Project found on browse page:', projectName)
  })

  test('buy tokens flow updates funding progress on project detail page', async ({
    page,
    wallet,
  }) => {
    const { graphqlUrl, projectFactoryAddress, paymentTokenAddress } = getContractAddresses()

    if (!projectFactoryAddress) {
      throw new Error(
        'ProjectFactory contract address not set in ui/.env. ' +
          'Expected VITE_PROJECT_FACTORY_CONTRACT_ADDRESS.'
      )
    }

    const ipfsConfig = createIPFSConfigInNodeJSFromTheUsualEnvVars()
    const account0Clients = createE2ETestClients('ACCOUNT_0')
    const account1Clients = createE2ETestClients('ACCOUNT_1')

    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
    }

    const tokenPrice = parseUnits('0.1', 6)

    // =========================================================================
    // Step 1: Create a project (ACCOUNT_0 as owner/recipient)
    // =========================================================================
    console.log('\n=== CREATING PROJECT ===')
    const projectName = `E2E Buy Test ${Date.now()}`
    const projectMetadataCid = await uploadToIPFS(ipfsConfig, {
      name: projectName,
      description: 'Created by lazyGiving E2E test for buying tokens',
    })

    const { projectDetails } = await createProject(
      account0Clients,
      projectFactoryContract,
      {
        metadataURI: `ipfs://${projectMetadataCid}/`,
        contractURI: `ipfs://${projectMetadataCid}`,
        owner: account0Clients.account,
        recipient: account0Clients.account,
        paymentToken: paymentTokenAddress!,
        threshold: parseUnits('10', 6),
        deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30), // 30 days
        projectMetadataCid,
        tokenIds: [0n],
        tokenCounts: [100n],
        tokenPrices: [tokenPrice],
      }
    )
    console.log('Project assurance contract:', projectDetails.assuranceContractAddress)

    // =========================================================================
    // Step 2: ACCOUNT_1 buys 5 tokens (0.5 ETH)
    // =========================================================================
    console.log('\n=== BUYING TOKENS ===')
    const assuranceContract: AssuranceContract = {
      address: projectDetails.assuranceContractAddress,
      abi: AssuranceContractAbi,
    }

    await buyProjectTokens(account1Clients, assuranceContract, {
      buyer: account1Clients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [0n],
      tokenCounts: [5n],
      totalCost: tokenPrice * 5n, // 0.5 ETH for 5 tokens
    })
    console.log('Bought 5 tokens for 0.5 ETH')

    // Wait for the indexer to process the project creation event
    await waitForProject(graphqlUrl, projectDetails.assuranceContractAddress)

    // =========================================================================
    // Step 3: Navigate to project detail page and verify funding progress
    // =========================================================================
    console.log('\n=== VERIFYING PROJECT DETAIL PAGE ===')
    await page.goto(`/projects/${projectDetails.assuranceContractAddress}`)
    await wallet.connect('ACCOUNT_0')

    // The project header shows "X of Y <symbol> raised"
    // We bought 0.5 ETH worth of tokens, so it should show "0.5 of 10 <symbol> raised"
    await expect(page.getByText(/0\.5.*of.*10.*raised/i)).toBeVisible({
      timeout: 20000,
    })
    console.log('Funding progress verified: 0.5 of 10 raised')
  })
})
