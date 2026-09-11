import { test, expect } from './fixtures/wallet'
import {
  createE2EMachinery,
  createE2EWriteClients,
  getContractAddresses,
  publishE2EDisplayableMetadata,
  verifyE2EChannelOwnership,
} from './utils/blockchain'
import { waitForProject, waitForProjectDisavowed } from './utils/indexer'
import { expectTextVisibleEventually } from './utils/visibility'
import { AssuranceContractAbi, BeneficiaryRegistryAbi, ProjectFactoryAbi } from '@commonality/sdk/abis'
import { disavowProject, hashBeneficiaryId } from '@commonality/sdk/content-funding'
import { createProject, buyProjectTokens, getProject, type ProjectFactoryContract, type AssuranceContract } from '@commonality/sdk/lazy-giving'
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync'
import { formatUnits, parseUnits } from 'viem'

const COMMUNITY_CREATED_NOTICE =
  'Community-created; not affiliated with or endorsed by the beneficiary.'

function formatIndexedFundingRaised(project: NonNullable<Awaited<ReturnType<typeof getProject>>>): string {
  const current = BigInt(project.totalReceived)
  const target = BigInt(project.threshold)
  const formattedCurrent = formatUnits(current, project.fundingCurrency.decimals)
  if (target === 0n) {
    return `${formattedCurrent} ${project.fundingCurrency.symbol} raised`
  }
  return `${formattedCurrent} of ${formatUnits(target, project.fundingCurrency.decimals)} ${project.fundingCurrency.symbol} raised`
}

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

    const clients = createE2EWriteClients('ACCOUNT_0')

    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
    }

    // Create a project with a unique name so we can find it later
    const projectName = `E2E Browse Test ${Date.now()}`
    console.log('\n=== CREATING PROJECT ===')
    const projectMetadataCid = await publishE2EDisplayableMetadata(clients, {
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

    // The project name should appear in the list. The UI fetches metadata
    // client-side from freshly-indexed events, so retry with reloads if the
    // first browser query raced the indexer/event-cache refresh.
    await expectTextVisibleEventually(page, projectName)
    console.log('Project found on browse page:', projectName)
  })

  test('newcomer donor discovers a project, funds it, and sees indexed funding progress', async ({
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

    const account0Clients = createE2EWriteClients('ACCOUNT_0')
    const account1Clients = createE2EWriteClients('ACCOUNT_1')

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
    const projectMetadataCid = await publishE2EDisplayableMetadata(account0Clients, {
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

    const purchaseHash = await buyProjectTokens(account1Clients, assuranceContract, {
      buyer: account1Clients.account,
      tokenAddress: projectDetails.tokenAddress,
      tokenIds: [0n],
      tokenCounts: [5n],
      totalCost: tokenPrice * 5n, // 0.5 ETH for 5 tokens
    })
    console.log('Bought 5 tokens for 0.5 ETH')

    await waitForIndexerToSyncToTxHash(
      createE2EMachinery(),
      account1Clients.publicClient,
      purchaseHash,
      60_000
    )
    await waitForProject(graphqlUrl, projectDetails.assuranceContractAddress)

    // =========================================================================
    // Step 3: Start like a newcomer: browse projects, discover this project,
    // then open its detail page and verify the funded readback.
    // =========================================================================
    console.log('\n=== DISCOVERING FUNDED PROJECT ON BROWSE PAGE ===')
    await page.goto('/projects')
    await wallet.connect('ACCOUNT_0')
    await expectTextVisibleEventually(page, projectName)
    await page.getByText(projectName).click()
    await expect(page).toHaveURL(new RegExp(`/projects/(?:eip155%3A31337%3A)?${projectDetails.assuranceContractAddress}`, 'i'))

    console.log('\n=== VERIFYING PROJECT DETAIL PAGE ===')

    // The project header should render the same funding total that the SDK reads
    // back from the indexer's event cache. This catches wrong-but-present UI
    // values, not just the presence of a generic progress string.
    const indexedProject = await getProject(createE2EMachinery(), projectDetails.assuranceContractAddress)
    expect(indexedProject).not.toBeNull()
    const expectedFundingProgress = formatIndexedFundingRaised(indexedProject!)
    await expect(page.getByText(expectedFundingProgress, { exact: true })).toBeVisible({
      timeout: 20000,
    })
    console.log('Funding progress verified:', expectedFundingProgress)
  })

  test('website-beneficiary proposal: reuse, community-created copy, then disavow', async ({
    page,
    wallet,
  }) => {
    const { graphqlUrl, projectFactoryAddress, paymentTokenAddress, beneficiaryRegistryAddress } =
      getContractAddresses()

    if (!projectFactoryAddress || !paymentTokenAddress || !beneficiaryRegistryAddress) {
      throw new Error(
        'Expected VITE_PROJECT_FACTORY_CONTRACT_ADDRESS, VITE_PAYMENT_TOKEN_ADDRESS, and VITE_BENEFICIARY_REGISTRY_ADDRESS.'
      )
    }

    const proposer = createE2EWriteClients('ACCOUNT_0')
    const payoutWallet = createE2EWriteClients('ACCOUNT_1')
    const domain = `e2e${Date.now()}.org`
    const projectName = `E2E Third-Party Proposal ${Date.now()}`
    const projectFactoryContract: ProjectFactoryContract = {
      address: projectFactoryAddress,
      abi: ProjectFactoryAbi,
    }
    const registryContract = { address: beneficiaryRegistryAddress, abi: BeneficiaryRegistryAbi }

    const projectMetadataCid = await publishE2EDisplayableMetadata(proposer, {
      name: projectName,
      description: 'Unaffiliated proposal for a website beneficiary',
      statementType: 'lazy-giving-project-metadata',
      beneficiary: { namespace: 'dns', canonicalIdentifier: domain },
    })

    const { hash: createHash, projectDetails } = await createProject(proposer, projectFactoryContract, {
      metadataURI: `ipfs://${projectMetadataCid}/`,
      contractURI: `ipfs://${projectMetadataCid}`,
      owner: proposer.account,
      beneficiaryId: hashBeneficiaryId('dns', domain),
      paymentToken: paymentTokenAddress,
      threshold: parseUnits('10', 6),
      deadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 30),
      projectMetadataCid,
      tokenIds: [0n],
      tokenCounts: [100n],
      tokenPrices: [parseUnits('0.1', 6)],
    })
    await waitForIndexerToSyncToTxHash(
      createE2EMachinery(),
      proposer.publicClient,
      createHash,
      60_000,
    )
    await waitForProject(graphqlUrl, projectDetails.assuranceContractAddress)

    await page.goto('/projects')
    await wallet.connect('ACCOUNT_0')
    await expectTextVisibleEventually(page, projectName)
    await expect(page.getByText(COMMUNITY_CREATED_NOTICE).first()).toBeVisible()

    await page.getByText(projectName).click()
    await expect(page.getByText(COMMUNITY_CREATED_NOTICE).first()).toBeVisible()

    await page.goto(`/projects/new?beneficiary=${encodeURIComponent(domain)}`)
    await expect(page.getByRole('heading', { name: 'Propose a project' })).toBeVisible()
    await expect(page.getByTestId('existing-beneficiary-projects')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('link', { name: projectName })).toBeVisible()
    await expect(page.getByText(COMMUNITY_CREATED_NOTICE).first()).toBeVisible()

    await verifyE2EChannelOwnership(payoutWallet, `dns:${domain}`)
    const { hash: disavowHash } = await disavowProject(
      payoutWallet,
      registryContract,
      hashBeneficiaryId('dns', domain),
      projectDetails.assuranceContractAddress,
    )
    await waitForIndexerToSyncToTxHash(
      createE2EMachinery(),
      payoutWallet.publicClient,
      disavowHash,
      60_000,
    )
    await waitForProjectDisavowed(graphqlUrl, projectDetails.assuranceContractAddress)

    await page.goto('/projects')
    await expectTextVisibleEventually(
      page,
      /Show \d+ project(?:s)? disavowed by the named beneficiary/,
    )
    await expect(page.getByText(projectName)).toHaveCount(0)

    await page.goto(`/projects/new?beneficiary=${encodeURIComponent(domain)}`)
    await expect(page.getByRole('heading', { name: 'Propose a project' })).toBeVisible()
    await expect(page.getByTestId('existing-beneficiary-projects-loading')).toHaveCount(0, {
      timeout: 30_000,
    })
    await expect(page.getByTestId('existing-beneficiary-projects')).toHaveCount(0)

    await page.goto(
      `/projects/${encodeURIComponent(`eip155:31337:${projectDetails.assuranceContractAddress}`)}`,
    )
    await expectTextVisibleEventually(page, projectName)
    await expect(
      page.getByText('The named beneficiary has disavowed this project', { exact: false }),
    ).toBeVisible()
  })
})
