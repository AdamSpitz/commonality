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

import { createTestClients, type TestClients } from '@commonality/sdk'
import { TEST_PRIVATE_KEYS } from '@commonality/sdk'
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
 * import { createE2ETestClients } from './utils/blockchain'
 * import { createAndSignStatement } from '@commonality/sdk'
 *
 * const clients = createE2ETestClients('ACCOUNT_0')
 * await createAndSignStatement(clients, contracts, statementData)
 */
export function createE2ETestClients(
  accountName: AccountName,
  rpcUrl = 'http://localhost:8545'
): TestClients {
  const privateKey = ACCOUNT_PRIVATE_KEYS[accountName]
  return createTestClients(privateKey, rpcUrl)
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
  const pubstarterAddress =
    envVars.VITE_PUBSTARTER_CONTRACT_ADDRESS ||
    process.env.VITE_PUBSTARTER_CONTRACT_ADDRESS
  const trustRegistryAddress =
    envVars.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS ||
    process.env.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS
  const contentRegistryAddress =
    envVars.VITE_CONTENT_REGISTRY_ADDRESS ||
    process.env.VITE_CONTENT_REGISTRY_ADDRESS
  const channelRegistryAddress =
    envVars.VITE_CHANNEL_REGISTRY_ADDRESS ||
    process.env.VITE_CHANNEL_REGISTRY_ADDRESS
  const channelEscrowAddress =
    envVars.VITE_CHANNEL_ESCROW_ADDRESS ||
    process.env.VITE_CHANNEL_ESCROW_ADDRESS
  const creatorContractFactoryAddress =
    envVars.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS ||
    process.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS
  const graphqlUrl =
    envVars.VITE_GRAPHQL_URL ||
    process.env.VITE_GRAPHQL_URL ||
    'http://localhost:42069/graphql'

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
    pubstarterAddress: pubstarterAddress as `0x${string}` | undefined,
    trustRegistryAddress: trustRegistryAddress as `0x${string}` | undefined,
    contentRegistryAddress: contentRegistryAddress as `0x${string}` | undefined,
    channelRegistryAddress: channelRegistryAddress as `0x${string}` | undefined,
    channelEscrowAddress: channelEscrowAddress as `0x${string}` | undefined,
    creatorContractFactoryAddress: creatorContractFactoryAddress as `0x${string}` | undefined,
    graphqlUrl,
  }
}
