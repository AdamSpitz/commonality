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
  const xaiKey = firstEnv(env, ['XAI_API_KEY', 'GROK_API_KEY', 'GROK_API_Key'])
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
    port: Number(env.PORT || env.CAUSE_ASSIST_PORT || 3002),
  }
}
