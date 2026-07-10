export type UiRuntimeConfig = Partial<Record<RuntimeConfigKey, string>> & {
  COMMONALITY_ENVIRONMENT?: 'local' | 'testnet' | 'mainnet'
}

export type RuntimeConfigKey =
  | 'VITE_EVENT_CACHE_URL'
  | 'VITE_IPFS_GATEWAY'
  | 'VITE_IPFS_API'
  | 'VITE_PLATFORM_API_URL'
  | 'VITE_ENABLE_CHANNEL_METADATA_LOOKUP'
  | 'VITE_MAINNET_RPC_URL'
  | 'VITE_ETH_RPC_URL'
  | 'VITE_BELIEFS_CONTRACT_ADDRESS'
  | 'VITE_IMPLICATIONS_CONTRACT_ADDRESS'
  | 'VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS'
  | 'VITE_ERC1155_FACTORY_ADDRESS'
  | 'VITE_MARKETPLACE_FACTORY_ADDRESS'
  | 'VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS'
  | 'VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS'
  | 'VITE_NOTE_INTENT_CONTRACT_ADDRESS'
  | 'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS'
  | 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS'
  | 'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS'
  | 'VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS'
  | 'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'
  | 'VITE_CONTENT_REGISTRY_ADDRESS'
  | 'VITE_CHANNEL_REGISTRY_ADDRESS'
  | 'VITE_CHANNEL_ESCROW_ADDRESS'
  | 'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS'
  | 'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS'
  | 'VITE_CREATOR_GAS_TANK_ADDRESS'
  | 'VITE_SPONSORED_GAS_ENTRY_POINT_ADDRESS'
  | 'VITE_PAYMENT_TOKEN_ADDRESS'
  | 'VITE_CHAIN_ID'
  | 'VITE_PAYMENT_TOKEN_SYMBOL'
  | 'VITE_PAYMENT_TOKEN_DECIMALS'
  | 'VITE_DEFAULT_TRUSTED_ATTESTERS'
  | 'VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS'
  | 'VITE_DEFAULT_TRUSTED_BEAT_AGENTS'
  | 'VITE_NONINFLAMMATORY_TOPIC_CID'
  | 'VITE_DEFAULT_NUDGERS'
  | 'VITE_CSM_MEDIATOR_NUDGER'
  | 'VITE_COMMONALITY_URL'
  | 'VITE_LAZYGIVING_URL'
  | 'VITE_ALIGNMENT_URL'
  | 'VITE_TALLY_URL'
  | 'VITE_CONTENT_FUNDING_URL'
  | 'VITE_CIVILITY_URL'
  | 'VITE_COMMON_SENSE_MAJORITY_URL'
  | 'VITE_CONCEPTSPACE_URL'

const buildTimeConfig: UiRuntimeConfig = {
  VITE_EVENT_CACHE_URL: import.meta.env.VITE_EVENT_CACHE_URL,
  VITE_IPFS_GATEWAY: import.meta.env.VITE_IPFS_GATEWAY,
  VITE_IPFS_API: import.meta.env.VITE_IPFS_API,
  VITE_PLATFORM_API_URL: import.meta.env.VITE_PLATFORM_API_URL,
  VITE_ENABLE_CHANNEL_METADATA_LOOKUP: import.meta.env.VITE_ENABLE_CHANNEL_METADATA_LOOKUP,
  VITE_MAINNET_RPC_URL: import.meta.env.VITE_MAINNET_RPC_URL,
  VITE_ETH_RPC_URL: import.meta.env.VITE_ETH_RPC_URL,
  VITE_BELIEFS_CONTRACT_ADDRESS: import.meta.env.VITE_BELIEFS_CONTRACT_ADDRESS,
  VITE_IMPLICATIONS_CONTRACT_ADDRESS: import.meta.env.VITE_IMPLICATIONS_CONTRACT_ADDRESS,
  VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS: import.meta.env.VITE_ASSURANCE_CONTRACT_FACTORY_ADDRESS,
  VITE_ERC1155_FACTORY_ADDRESS: import.meta.env.VITE_ERC1155_FACTORY_ADDRESS,
  VITE_MARKETPLACE_FACTORY_ADDRESS: import.meta.env.VITE_MARKETPLACE_FACTORY_ADDRESS,
  VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS: import.meta.env.VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS,
  VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS: import.meta.env.VITE_RECURRING_PLEDGES_CONTRACT_ADDRESS,
  VITE_NOTE_INTENT_CONTRACT_ADDRESS: import.meta.env.VITE_NOTE_INTENT_CONTRACT_ADDRESS,
  VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: import.meta.env.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS,
  VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
  VITE_TRUST_REGISTRY_CONTRACT_ADDRESS: import.meta.env.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS,
  VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS: import.meta.env.VITE_ACCOUNT_ASSERTIONS_CONTRACT_ADDRESS,
  VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: import.meta.env.VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS,
  VITE_CONTENT_REGISTRY_ADDRESS: import.meta.env.VITE_CONTENT_REGISTRY_ADDRESS,
  VITE_CHANNEL_REGISTRY_ADDRESS: import.meta.env.VITE_CHANNEL_REGISTRY_ADDRESS,
  VITE_CHANNEL_ESCROW_ADDRESS: import.meta.env.VITE_CHANNEL_ESCROW_ADDRESS,
  VITE_CREATOR_CONTRACT_FACTORY_ADDRESS: import.meta.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS,
  VITE_PROJECT_FACTORY_CONTRACT_ADDRESS: import.meta.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS,
  VITE_CREATOR_GAS_TANK_ADDRESS: import.meta.env.VITE_CREATOR_GAS_TANK_ADDRESS,
  VITE_SPONSORED_GAS_ENTRY_POINT_ADDRESS: import.meta.env.VITE_SPONSORED_GAS_ENTRY_POINT_ADDRESS,
  VITE_PAYMENT_TOKEN_ADDRESS: import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS,
  VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
  VITE_PAYMENT_TOKEN_SYMBOL: import.meta.env.VITE_PAYMENT_TOKEN_SYMBOL,
  VITE_PAYMENT_TOKEN_DECIMALS: import.meta.env.VITE_PAYMENT_TOKEN_DECIMALS,
  COMMONALITY_ENVIRONMENT: import.meta.env.COMMONALITY_ENVIRONMENT,
  VITE_DEFAULT_TRUSTED_ATTESTERS: import.meta.env.VITE_DEFAULT_TRUSTED_ATTESTERS,
  VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS: import.meta.env.VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS,
  VITE_DEFAULT_TRUSTED_BEAT_AGENTS: import.meta.env.VITE_DEFAULT_TRUSTED_BEAT_AGENTS,
  VITE_NONINFLAMMATORY_TOPIC_CID: import.meta.env.VITE_NONINFLAMMATORY_TOPIC_CID,
  VITE_DEFAULT_NUDGERS: import.meta.env.VITE_DEFAULT_NUDGERS,
  VITE_CSM_MEDIATOR_NUDGER: import.meta.env.VITE_CSM_MEDIATOR_NUDGER,
  VITE_COMMONALITY_URL: import.meta.env.VITE_COMMONALITY_URL,
  VITE_LAZYGIVING_URL: import.meta.env.VITE_LAZYGIVING_URL,
  VITE_ALIGNMENT_URL: import.meta.env.VITE_ALIGNMENT_URL,
  VITE_TALLY_URL: import.meta.env.VITE_TALLY_URL,
  VITE_CONTENT_FUNDING_URL: import.meta.env.VITE_CONTENT_FUNDING_URL,
  VITE_CIVILITY_URL: import.meta.env.VITE_CIVILITY_URL,
  VITE_COMMON_SENSE_MAJORITY_URL: import.meta.env.VITE_COMMON_SENSE_MAJORITY_URL,
  VITE_CONCEPTSPACE_URL: import.meta.env.VITE_CONCEPTSPACE_URL,
}

let runtimeConfig: UiRuntimeConfig = stripEmptyValues(buildTimeConfig)

export async function loadRuntimeConfig(url = './config.json'): Promise<UiRuntimeConfig> {
  try {
    const response = await fetch(url, { cache: 'no-store' })
    if (response.status === 404) {
      return runtimeConfig
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const loadedConfig = await response.json() as UiRuntimeConfig
    runtimeConfig = validateRuntimeConfig({
      ...runtimeConfig,
      ...stripEmptyValues(loadedConfig),
    })
    return runtimeConfig
  } catch (error) {
    if (isRuntimeConfigValidationError(error)) {
      throw error
    }
    if (import.meta.env.MODE === 'ipfs') {
      throw new Error(`Failed to load UI runtime config from ${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
    return runtimeConfig
  }
}

export function getRuntimeConfig(): UiRuntimeConfig {
  return runtimeConfig
}

export function getRuntimeConfigValue(key: RuntimeConfigKey): string | undefined {
  return runtimeConfig[key]
}

function isRuntimeConfigValidationError(error: unknown): error is Error {
  return error instanceof Error && error.message.startsWith('Channel metadata lookup is required')
}

function validateRuntimeConfig(config: UiRuntimeConfig): UiRuntimeConfig {
  const environment = config.COMMONALITY_ENVIRONMENT
  if (environment && environment !== 'local') {
    if (config.VITE_ENABLE_CHANNEL_METADATA_LOOKUP !== 'true') {
      throw new Error(`Channel metadata lookup is required for ${environment}. Set VITE_ENABLE_CHANNEL_METADATA_LOOKUP=true and configure the deployed platform API.`)
    }
    if (!config.VITE_PLATFORM_API_URL) {
      throw new Error(`Channel metadata lookup is required for ${environment}, but VITE_PLATFORM_API_URL is not configured.`)
    }
  }
  return config
}

function stripEmptyValues(config: UiRuntimeConfig): UiRuntimeConfig {
  return Object.fromEntries(
    Object.entries(config).filter(([, value]) => value !== undefined && value !== ''),
  ) as UiRuntimeConfig
}
