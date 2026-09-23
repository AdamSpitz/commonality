import type { Address } from 'viem'
import { configuredAddress, type DeployedContractAddresses, type FundingContractAddresses } from '@commonality/sdk/machinery'

function env(name: string, fallback?: string): string | undefined {
  const value = process.env[name]
  if (value && value.length > 0) return value
  return fallback
}

function address(name: string): Address | undefined {
  return configuredAddress(env(name))
}

export const CAUSE_ASSIST_PATHS = [
  '/atomize',
  '/sharpen-plank',
  '/draft-anchor',
  '/suggest-statements',
  '/suggest-mediator-scaffold',
  '/draft-modified-plank',
  '/draft-stand-in-sliver',
  '/draft-bridge-plank',
  '/critique-triple',
  '/check-implications',
  '/safety-check',
  '/check-coherence',
  '/health',
] as const

export type CauseAssistPath = (typeof CAUSE_ASSIST_PATHS)[number]

export function isCauseAssistPath(path: string): path is CauseAssistPath {
  return (CAUSE_ASSIST_PATHS as readonly string[]).includes(path)
}

/** True when the four funding core addresses are set. Conceptspace-only env omits them. */
export function mcpFundingConfigured(): boolean {
  return loadFundingAddresses().assuranceContractFactory !== undefined
}

function loadFundingAddresses(): Partial<FundingContractAddresses> {
  const assuranceContractFactory = address('ASSURANCE_CONTRACT_FACTORY_ADDRESS')
  const erc1155Factory = address('ERC1155_FACTORY_ADDRESS')
  const delegatableNotes = address('DELEGATABLE_NOTES_CONTRACT_ADDRESS') ?? address('DELEGATABLE_NOTES_ADDRESS')
  const noteIntent = address('NOTE_INTENT_ADDRESS')
  if (!assuranceContractFactory || !erc1155Factory || !delegatableNotes || !noteIntent) {
    return {}
  }
  return { assuranceContractFactory, erc1155Factory, delegatableNotes, noteIntent }
}

function loadContractAddresses(): DeployedContractAddresses {
  return {
    beliefs: address('BELIEFS_CONTRACT_ADDRESS'),
    implications: address('IMPLICATIONS_CONTRACT_ADDRESS'),
    ...loadFundingAddresses(),
    alignmentAttestations: address('PROJECT_ALIGNMENT_CONTRACT_ADDRESS') ?? address('ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS'),
    mutableRefUpdater: address('MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') ?? address('MUTABLE_REF_UPDATER_ADDRESS'),
    trustRegistry: address('TRUST_REGISTRY_ADDRESS'),
    nudgePublications: address('NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'),
    publishedData: address('PUBLISHED_DATA_CONTRACT_ADDRESS'),
  }
}

export function loadMcpConfig() {
  return {
    writesEnabled: process.env.COMMONALITY_MCP_WRITES === '1',
    privateKey: (env('MCP_PRIVATE_KEY') ?? env('ETHEREUM_PRIVATE_KEY') ?? env('PRIVATE_KEY')) as `0x${string}` | undefined,
    rpcUrl: env('ETH_RPC_URL') ?? env('RPC_URL') ?? 'http://127.0.0.1:8545',
    eventCacheUrl: env('EVENT_CACHE_URL') ?? 'http://localhost:42069',
    causeAssistUrl: (env('CAUSE_ASSIST_URL') ?? 'http://127.0.0.1:3002').replace(/\/$/, ''),
    implicationAttesterUrl: (env('IMPLICATION_ATTESTER_URL') ?? 'http://localhost:3006/implication-attester').replace(/\/$/, ''),
    contractAddresses: loadContractAddresses(),
  }
}
