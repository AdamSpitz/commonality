export type UiRuntimeConfig = Partial<Record<RuntimeConfigKey, string>> & {
  COMMONALITY_ENVIRONMENT?: 'local' | 'testnet' | 'mainnet'
}

export type RuntimeConfigKey =
  | 'VITE_GRAPHQL_URL'
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
  | 'VITE_NOTE_INTENT_CONTRACT_ADDRESS'
  | 'VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS'
  | 'VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS'
  | 'VITE_TRUST_REGISTRY_CONTRACT_ADDRESS'
  | 'VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS'
  | 'VITE_CONTENT_REGISTRY_ADDRESS'
  | 'VITE_CHANNEL_REGISTRY_ADDRESS'
  | 'VITE_CHANNEL_ESCROW_ADDRESS'
  | 'VITE_CREATOR_CONTRACT_FACTORY_ADDRESS'
  | 'VITE_PROJECT_FACTORY_CONTRACT_ADDRESS'
  | 'VITE_PAYMENT_TOKEN_ADDRESS'
  | 'VITE_PAYMENT_TOKEN_SYMBOL'
  | 'VITE_PAYMENT_TOKEN_DECIMALS'
  | 'VITE_DEFAULT_TRUSTED_ATTESTERS'
  | 'VITE_DEFAULT_NUDGERS'
  | 'VITE_COMMONALITY_URL'
  | 'VITE_PUBSTARTER_URL'
  | 'VITE_ALIGNMENT_URL'
  | 'VITE_TALLY_URL'
  | 'VITE_CONTENT_FUNDING_URL'
  | 'VITE_NONINFLAMMATORY_URL'
  | 'VITE_CSM_URL'
  | 'VITE_CONCEPTSPACE_URL'

const buildTimeConfig: UiRuntimeConfig = {
  VITE_GRAPHQL_URL: import.meta.env.VITE_GRAPHQL_URL,
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
  VITE_NOTE_INTENT_CONTRACT_ADDRESS: import.meta.env.VITE_NOTE_INTENT_CONTRACT_ADDRESS,
  VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS: import.meta.env.VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS,
  VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS: import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS,
  VITE_TRUST_REGISTRY_CONTRACT_ADDRESS: import.meta.env.VITE_TRUST_REGISTRY_CONTRACT_ADDRESS,
  VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS: import.meta.env.VITE_NUDGE_PUBLICATIONS_CONTRACT_ADDRESS,
  VITE_CONTENT_REGISTRY_ADDRESS: import.meta.env.VITE_CONTENT_REGISTRY_ADDRESS,
  VITE_CHANNEL_REGISTRY_ADDRESS: import.meta.env.VITE_CHANNEL_REGISTRY_ADDRESS,
  VITE_CHANNEL_ESCROW_ADDRESS: import.meta.env.VITE_CHANNEL_ESCROW_ADDRESS,
  VITE_CREATOR_CONTRACT_FACTORY_ADDRESS: import.meta.env.VITE_CREATOR_CONTRACT_FACTORY_ADDRESS,
  VITE_PROJECT_FACTORY_CONTRACT_ADDRESS: import.meta.env.VITE_PROJECT_FACTORY_CONTRACT_ADDRESS,
  VITE_PAYMENT_TOKEN_ADDRESS: import.meta.env.VITE_PAYMENT_TOKEN_ADDRESS,
  VITE_PAYMENT_TOKEN_SYMBOL: import.meta.env.VITE_PAYMENT_TOKEN_SYMBOL,
  VITE_PAYMENT_TOKEN_DECIMALS: import.meta.env.VITE_PAYMENT_TOKEN_DECIMALS,
  VITE_DEFAULT_TRUSTED_ATTESTERS: import.meta.env.VITE_DEFAULT_TRUSTED_ATTESTERS,
  VITE_DEFAULT_NUDGERS: import.meta.env.VITE_DEFAULT_NUDGERS,
  VITE_COMMONALITY_URL: import.meta.env.VITE_COMMONALITY_URL,
  VITE_PUBSTARTER_URL: import.meta.env.VITE_PUBSTARTER_URL,
  VITE_ALIGNMENT_URL: import.meta.env.VITE_ALIGNMENT_URL,
  VITE_TALLY_URL: import.meta.env.VITE_TALLY_URL,
  VITE_CONTENT_FUNDING_URL: import.meta.env.VITE_CONTENT_FUNDING_URL,
  VITE_NONINFLAMMATORY_URL: import.meta.env.VITE_NONINFLAMMATORY_URL,
  VITE_CSM_URL: import.meta.env.VITE_CSM_URL,
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
