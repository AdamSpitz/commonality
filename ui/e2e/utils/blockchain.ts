/**
 * Blockchain utilities for E2E tests
 *
 * This module provides utilities to interact with smart contracts directly
 * from E2E tests using viem test clients, bypassing wagmi's connector system.
 *
 * Why bypass wagmi in E2E tests?
 * - wagmi's mock connector doesn't support private key signing
 * - Creating a custom connector is complex (~200-300 lines)
 * - Direct viem client approach is simpler and matches integration test patterns
 *
 * The UI still uses wagmi for real browser wallet integration, but E2E tests
 * verify contract interactions using direct viem calls, then check UI updates
 * via the GraphQL indexer.
 */

// Configure SDK to use real IPFS instead of mock for E2E tests
// This ensures IPFS content uploaded by SDK is available to the indexer
// The indexer runs in Docker and fetches from the same IPFS node
if (!process.env.IPFS_API) {
  process.env.IPFS_API = 'http://localhost:5001'
}

import { ChannelRegistryAbi } from '@commonality/sdk/abis'
import { hashCanonicalId, verifyChannel } from '@commonality/sdk/content-funding'
import { createSDKMachinery, type SDKMachinery } from '@commonality/sdk/machinery'
import { createWriteClients, type WriteClients } from '@commonality/sdk/utils'
import { TEST_PRIVATE_KEYS } from '@commonality/sdk/utils'
import { createPublicClient, http, keccak256, toBytes, type Hex } from 'viem'
import { hardhat } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
import type { AccountName } from '../fixtures/wallet'

/**
 * Map account names to private keys
 */
const ACCOUNT_PRIVATE_KEYS = {
  ACCOUNT_0: TEST_PRIVATE_KEYS.ACCOUNT_0,
  ACCOUNT_1: TEST_PRIVATE_KEYS.ACCOUNT_1,
  ACCOUNT_2: TEST_PRIVATE_KEYS.ACCOUNT_2,
  ACCOUNT_3: TEST_PRIVATE_KEYS.ACCOUNT_3,
  ACCOUNT_4: TEST_PRIVATE_KEYS.ACCOUNT_4,
  ACCOUNT_5: TEST_PRIVATE_KEYS.ACCOUNT_5,
  ACCOUNT_6: TEST_PRIVATE_KEYS.ACCOUNT_6,
  ACCOUNT_7: TEST_PRIVATE_KEYS.ACCOUNT_7,
  ACCOUNT_8: TEST_PRIVATE_KEYS.ACCOUNT_8,
  ACCOUNT_9: TEST_PRIVATE_KEYS.ACCOUNT_9,
} as const

const DEFAULT_LOCAL_VERIFIER_PRIVATE_KEY =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80' as const

/**
 * Create viem test clients for a Hardhat account.
 *
 * These clients can be used with SDK actions to directly interact with
 * smart contracts in E2E tests.
 *
 * @param accountName - Name of the Hardhat test account
 * @param rpcUrl - RPC URL (defaults to localhost:8545)
 * @returns Test clients with wallet, public client, and account address
 *
 * @example
 * import { createE2EWriteClients } from './utils/blockchain'
 * import { createAndSignStatement } from '@commonality/sdk/conceptspace'
 *
 * const clients = createE2EWriteClients('ACCOUNT_0')
 * await createAndSignStatement(clients, contracts, statementData)
 */
export function createE2EWriteClients(
  accountName: AccountName,
  rpcUrl = 'http://localhost:8545'
): WriteClients {
  const privateKey = ACCOUNT_PRIVATE_KEYS[accountName]
  return createWriteClients(privateKey, rpcUrl)
}

export function createE2EMachinery(rpcUrl = 'http://localhost:8545'): SDKMachinery {
  const addresses = getContractAddresses()
  const publicClient = createPublicClient({ chain: hardhat, transport: http(rpcUrl) })

  return createSDKMachinery({
    ipfsConfig: {
      gatewayUrl: envVars.VITE_IPFS_GATEWAY || process.env.VITE_IPFS_GATEWAY || 'http://localhost:8080',
      apiUrl: envVars.VITE_IPFS_API || process.env.VITE_IPFS_API || 'http://localhost:5001',
    },
    twitterApiConfig: {
      platformApiBaseUrl: envVars.VITE_PLATFORM_API_URL || process.env.VITE_PLATFORM_API_URL || 'http://localhost:3001',
      ethereumMainnetRpcUrl: envVars.VITE_MAINNET_RPC_URL || process.env.VITE_MAINNET_RPC_URL,
    },
    publicClient,
    eventCacheUrl: addresses.graphqlUrl,
    contractAddresses: {
      beliefs: addresses.beliefsAddress,
      implications: (envVars.VITE_IMPLICATIONS_CONTRACT_ADDRESS || process.env.VITE_IMPLICATIONS_CONTRACT_ADDRESS) as `0x${string}`,
      assuranceContractFactory: (envVars.VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS || process.env.VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS) as `0x${string}`,
      erc1155Factory: (envVars.VITE_ERC1155_FACTORY_ADDRESS || process.env.VITE_ERC1155_FACTORY_ADDRESS) as `0x${string}`,
      marketplaceFactory: (envVars.VITE_MARKETPLACE_FACTORY_ADDRESS || process.env.VITE_MARKETPLACE_FACTORY_ADDRESS) as `0x${string}`,
      delegatableNotes: addresses.delegatableNotesAddress as `0x${string}`,
      recurringPledges: (envVars.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS || process.env.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS) as `0x${string}` | undefined,
      noteIntent: (envVars.VITE_NOTE_INTENT_CONTRACT_ADDRESS || process.env.VITE_NOTE_INTENT_CONTRACT_ADDRESS) as `0x${string}`,
      alignmentAttestations: addresses.alignmentAttestationsAddress as `0x${string}`,
      mutableRefUpdater: addresses.mutableRefUpdaterAddress,
      trustRegistry: addresses.trustRegistryAddress as `0x${string}`,
      accountAssertions: (envVars.VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS || process.env.VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS) as `0x${string}` | undefined,
      nudgePublications: (envVars.VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS || process.env.VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS) as `0x${string}` | undefined,
      publishedData: addresses.publishedDataAddress,
      contentRegistry: addresses.contentRegistryAddress,
      channelRegistry: addresses.channelRegistryAddress,
      channelEscrow: addresses.channelEscrowAddress,
      creatorContractFactory: addresses.creatorContractFactoryAddress,
    },
    defaultChainId: 31337,
  })
}

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

/**
 * Load environment variables from ui/.env file
 * The global-setup.ts script writes contract addresses to this file
 */
function loadEnvFile(): Record<string, string> {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const envPath = resolve(__dirname, '../../.env')

    const envContent = readFileSync(envPath, 'utf-8')
    const env: Record<string, string> = {}

    for (const line of envContent.split('\n')) {
      const trimmedLine = line.trim()
      if (!trimmedLine || trimmedLine.startsWith('#')) continue

      const equalsIndex = trimmedLine.indexOf('=')
      if (equalsIndex > 0) {
        const key = trimmedLine.substring(0, equalsIndex)
        const value = trimmedLine.substring(equalsIndex + 1)
        env[key] = value
      }
    }

    return env
  } catch (error) {
    console.error('Failed to load .env file:', error)
    return {}
  }
}

// Load env vars once at module initialization
const envVars = loadEnvFile()

/**
 * Get contract addresses from environment variables.
 * These are set by the global-setup.ts script in ui/.env.
 *
 * @returns Contract addresses needed for SDK actions
 * @throws If required contract addresses are not set
 */
export function getContractAddresses() {
  const beliefsAddress =
    envVars.VITE_BELIEFS_CONTRACT_ADDRESS ||
    process.env.VITE_BELIEFS_CONTRACT_ADDRESS
  const alignmentAttestationsAddress =
    envVars.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS ||
    process.env.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS
  const mutableRefUpdaterAddress =
    envVars.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS ||
    process.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS
  const delegatableNotesAddress =
    envVars.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS ||
    process.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS
  const projectFactoryAddress =
    envVars.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS ||
    process.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS
  const paymentTokenAddress =
    envVars.VITE_PAYMENT_TOKEN_ADDRESS ||
    process.env.VITE_PAYMENT_TOKEN_ADDRESS
  const trustRegistryAddress =
    envVars.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS ||
    process.env.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS
  const contentRegistryAddress =
    envVars.VITE_CONTENT_REGISTRY_ADDRESS ||
    process.env.VITE_CONTENT_REGISTRY_ADDRESS
  const channelRegistryAddress =
    envVars.VITE_CHANNEL_REGISTRY_ADDRESS ||
    process.env.VITE_CHANNEL_REGISTRY_ADDRESS
  const channelVerifierAddress =
    envVars.VITE_CHANNEL_VERIFIER_ADDRESS ||
    process.env.VITE_CHANNEL_VERIFIER_ADDRESS
  const channelEscrowAddress =
    envVars.VITE_CHANNEL_ESCROW_ADDRESS ||
    process.env.VITE_CHANNEL_ESCROW_ADDRESS
  const creatorContractFactoryAddress =
    envVars.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS ||
    process.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS
  const publishedDataAddress =
    envVars.VITE_PUBLISHED_DATA_CONTRACT_ADDRESS ||
    process.env.VITE_PUBLISHED_DATA_CONTRACT_ADDRESS
  // Indexer base URL for the e2e poll helpers (they strip to the origin and hit
  // /status and /api/events). Named graphqlUrl for backwards-compat with the specs.
  const graphqlUrl =
    envVars.VITE_EVENT_CACHE_URL ||
    process.env.VITE_EVENT_CACHE_URL ||
    'http://localhost:42069'

  if (!beliefsAddress || !mutableRefUpdaterAddress) {
    throw new Error(
      `Contract addresses not set. Expected addresses in ui/.env file.\n` +
        `VITE_BELIEFS_CONTRACT_ADDRESS: ${beliefsAddress || 'NOT SET'}\n` +
        `VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: ${mutableRefUpdaterAddress || 'NOT SET'}`
    )
  }

  return {
    beliefsAddress: beliefsAddress as `0x${string}`,
    alignmentAttestationsAddress:
      alignmentAttestationsAddress as `0x${string}` | undefined,
    mutableRefUpdaterAddress: mutableRefUpdaterAddress as `0x${string}`,
    delegatableNotesAddress: delegatableNotesAddress as `0x${string}` | undefined,
    projectFactoryAddress: projectFactoryAddress as `0x${string}` | undefined,
    paymentTokenAddress: paymentTokenAddress as `0x${string}` | undefined,
    trustRegistryAddress: trustRegistryAddress as `0x${string}` | undefined,
    contentRegistryAddress: contentRegistryAddress as `0x${string}` | undefined,
    channelRegistryAddress: channelRegistryAddress as `0x${string}` | undefined,
    channelVerifierAddress: channelVerifierAddress as `0x${string}` | undefined,
    channelEscrowAddress: channelEscrowAddress as `0x${string}` | undefined,
    creatorContractFactoryAddress: creatorContractFactoryAddress as `0x${string}` | undefined,
    publishedDataAddress: publishedDataAddress as `0x${string}` | undefined,
    graphqlUrl,
  }
}

async function signChannelClaimProof(
  verifierPrivateKey: Hex,
  channelVerifierAddress: `0x${string}`,
  chainId: number,
  channelId: `0x${string}`,
  claimant: `0x${string}`,
  nonce: `0x${string}`,
  deadline: bigint,
  proofHash: `0x${string}`,
): Promise<`0x${string}`> {
  const verifierAccount = privateKeyToAccount(verifierPrivateKey)
  return verifierAccount.signTypedData({
    domain: {
      name: 'ChannelVerifier',
      version: '1',
      chainId,
      verifyingContract: channelVerifierAddress,
    },
    types: {
      ChannelClaim: [
        { name: 'channelId', type: 'bytes32' },
        { name: 'claimant', type: 'address' },
        { name: 'nonce', type: 'bytes32' },
        { name: 'deadline', type: 'uint256' },
        { name: 'proofHash', type: 'bytes32' },
      ],
    },
    primaryType: 'ChannelClaim',
    message: { channelId, claimant, nonce, deadline, proofHash },
  })
}

export async function verifyE2EChannelOwnership(
  clients: WriteClients,
  channelCanonicalId: string,
): Promise<void> {
  const { channelRegistryAddress, channelVerifierAddress } = getContractAddresses()

  if (!channelRegistryAddress) {
    throw new Error(
      'Channel registry address not set in ui/.env. Expected VITE_CHANNEL_REGISTRY_ADDRESS.'
    )
  }
  if (!channelVerifierAddress) {
    throw new Error(
      'Channel verifier address not set in ui/.env. Expected VITE_CHANNEL_VERIFIER_ADDRESS.'
    )
  }

  const verifierPrivateKey =
    (process.env.VERIFIER_PRIVATE_KEY as Hex | undefined) ??
    (envVars.VERIFIER_PRIVATE_KEY as Hex | undefined) ??
    DEFAULT_LOCAL_VERIFIER_PRIVATE_KEY
  const chainId = 31337
  const channelId = hashCanonicalId(channelCanonicalId)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600)
  const nonce = keccak256(toBytes(`e2e-${channelCanonicalId}-${Date.now()}`))
  const proofHash = keccak256(toBytes(`e2e-public-proof:${channelCanonicalId}:${nonce}`))
  const signature = await signChannelClaimProof(
    verifierPrivateKey,
    channelVerifierAddress,
    chainId,
    channelId,
    clients.account,
    nonce,
    deadline,
    proofHash
  )

  await verifyChannel(
    clients,
    { address: channelRegistryAddress, abi: ChannelRegistryAbi },
    channelId,
    clients.account,
    nonce,
    deadline,
    proofHash,
    signature
  )
}
