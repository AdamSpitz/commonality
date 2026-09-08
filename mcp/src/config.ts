import type { Address } from 'viem'
import type { ContractAddresses } from '@commonality/sdk/machinery'

function env(name: string, fallback?: string): string | undefined {
  const value = process.env[name]
  if (value && value.length > 0) return value
  return fallback
}

function address(name: string): Address | undefined {
  const value = env(name)
  return value ? (value as Address) : undefined
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

const ZERO: Address = '0x0000000000000000000000000000000000000000'

function loadContractAddresses(): ContractAddresses {
  return {
    beliefs: address('BELIEFS_CONTRACT_ADDRESS') ?? ZERO,
    implications: address('IMPLICATIONS_CONTRACT_ADDRESS') ?? ZERO,
    assuranceContractFactory: address('ASSURANCE_CONTRACT_FACTORY_ADDRESS') ?? ZERO,
    erc1155Factory: address('ERC1155_FACTORY_ADDRESS') ?? ZERO,
    delegatableNotes: address('DELEGATABLE_NOTES_CONTRACT_ADDRESS') ?? address('DELEGATABLE_NOTES_ADDRESS') ?? ZERO,
    noteIntent: address('NOTE_INTENT_ADDRESS') ?? ZERO,
    alignmentAttestations: address('PROJECT_ALIGNMENT_CONTRACT_ADDRESS') ?? address('ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS') ?? ZERO,
    mutableRefUpdater: address('MUTABLE_REF_UPDATER_CONTRACT_ADDRESS') ?? address('MUTABLE_REF_UPDATER_ADDRESS') ?? ZERO,
    trustRegistry: address('TRUST_REGISTRY_ADDRESS') ?? ZERO,
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
