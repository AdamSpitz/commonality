import type { CauseAssistConfig } from './types.js'

const DEFAULT_XAI_BASE_URL = 'https://api.x.ai/v1'
const DEFAULT_MODEL = 'grok-4.5'

function firstEnv(env: NodeJS.ProcessEnv, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): CauseAssistConfig {
  return {
    apiKey: firstEnv(env, [
      'XAI_API_KEY',
      'GROK_API_KEY',
      'GROK_API_Key',
      // Legacy fallback if someone still only has OpenRouter configured.
      'OPENROUTER_API_KEY',
    ]),
    apiBaseUrl: firstEnv(env, ['CAUSE_ASSIST_API_BASE_URL', 'XAI_API_BASE_URL']) || DEFAULT_XAI_BASE_URL,
    suggestModel: firstEnv(env, ['CAUSE_ASSIST_SUGGEST_MODEL', 'CAUSE_ASSIST_MODEL']) || DEFAULT_MODEL,
    safetyModel: firstEnv(env, ['CAUSE_ASSIST_SAFETY_MODEL', 'CAUSE_ASSIST_MODEL']) || DEFAULT_MODEL,
    port: Number(env.PORT || env.CAUSE_ASSIST_PORT || 3002),
  }
}
