import type { CauseAssistConfig } from './types.js'

const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1'
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const DEFAULT_MODEL = 'grok-4.5'
const DEFAULT_OPENROUTER_MODEL = 'x-ai/grok-4.5'

function firstEnv(env: NodeJS.ProcessEnv, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): CauseAssistConfig {
  const xaiKey = firstEnv(env, ['XAI_API_KEY'])
  // Legacy fallback if someone still only has OpenRouter configured.
  const openRouterKey = firstEnv(env, ['OPENROUTER_API_KEY'])
  const apiKey = xaiKey || openRouterKey
  const usingOpenRouterOnly = !xaiKey && Boolean(openRouterKey)

  const explicitBase = firstEnv(env, ['CAUSE_ASSIST_API_BASE_URL', 'XAI_API_BASE_URL'])
  const apiBaseUrl =
    explicitBase ||
    (usingOpenRouterOnly ? DEFAULT_OPENROUTER_BASE_URL : DEFAULT_XAI_BASE_URL)

  const defaultModel = usingOpenRouterOnly ? DEFAULT_OPENROUTER_MODEL : DEFAULT_MODEL

  return {
    apiKey,
    apiBaseUrl,
    suggestModel: firstEnv(env, ['CAUSE_ASSIST_SUGGEST_MODEL', 'CAUSE_ASSIST_MODEL']) || defaultModel,
    safetyModel: firstEnv(env, ['CAUSE_ASSIST_SAFETY_MODEL', 'CAUSE_ASSIST_MODEL']) || defaultModel,
    implicationModel:
      firstEnv(env, ['CAUSE_ASSIST_IMPLICATION_MODEL', 'CAUSE_ASSIST_SUGGEST_MODEL', 'CAUSE_ASSIST_MODEL'])
      || defaultModel,
    coherenceModel:
      firstEnv(env, ['CAUSE_ASSIST_COHERENCE_MODEL', 'CAUSE_ASSIST_SAFETY_MODEL', 'CAUSE_ASSIST_MODEL'])
      || defaultModel,
    port: Number(env.PORT || env.CAUSE_ASSIST_PORT || 3002),
    ethereumPrivateKey: firstEnv(env, [
      'CAUSE_ASSIST_COHERENCE_ATTESTER_PRIVATE_KEY',
      'COHERENCE_ATTESTER_PRIVATE_KEY',
    ]),
    coherenceAttesterAddress: firstEnv(env, [
      'CAUSE_ASSIST_COHERENCE_ATTESTER_ADDRESS',
      'COHERENCE_ATTESTER_ADDRESS',
    ]),
    ethereumRpcUrl: firstEnv(env, [
      'CAUSE_ASSIST_ETHEREUM_RPC_URL',
      'ETHEREUM_RPC_URL',
    ]),
    alignmentAttestationsContractAddress: firstEnv(env, [
      'ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS',
      'ALIGNMENT_ATTESTATIONS_ADDRESS',
    ]),
    ipfsGatewayUrl: firstEnv(env, [
      'CAUSE_ASSIST_IPFS_GATEWAY_URL',
      'IPFS_GATEWAY_URL',
      'IPFS_GATEWAY',
    ]),
    eventCacheUrl: firstEnv(env, [
      'CAUSE_ASSIST_EVENT_CACHE_URL',
      'EVENT_CACHE_URL',
      'VITE_EVENT_CACHE_URL',
    ]),
    publishedDataContractAddress: firstEnv(env, [
      'PUBLISHED_DATA_CONTRACT_ADDRESS',
      'VITE_PUBLISHED_DATA_CONTRACT_ADDRESS',
    ]),
    chainId: env.CHAIN_ID || env.VITE_CHAIN_ID
      ? Number(env.CHAIN_ID || env.VITE_CHAIN_ID)
      : undefined,
  }
}
