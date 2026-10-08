import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const GROK_KEY_ALIASES = ['XAI_API_KEY', 'GROK_API_KEY', 'grok_api_key'] as const

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const raw of contents.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

/** Map grok/xAI and X token aliases onto the canonical names used elsewhere. */
export function normalizeKeyAliases(env: NodeJS.ProcessEnv = process.env): void {
  if (!env.XAI_API_KEY?.trim()) {
    for (const key of GROK_KEY_ALIASES) {
      if (key === 'XAI_API_KEY') continue
      const value = env[key]?.trim()
      if (value) {
        env.XAI_API_KEY = value
        break
      }
    }
  }
  if (!env.X_BEARER_TOKEN?.trim()) {
    const value = env.X_API_BEARER_TOKEN?.trim()
    if (value) env.X_BEARER_TOKEN = value
  }
}

export function loadRepoEnv(env: NodeJS.ProcessEnv = process.env): void {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const roots = [
    path.resolve(here, '../..'),
    process.cwd(),
    path.resolve(process.cwd(), '..'),
  ]
  for (const root of roots) {
    for (const name of ['.env.grok', '.env']) {
      const file = path.join(root, name)
      if (!existsSync(file)) continue
      const parsed = parseEnvFile(readFileSync(file, 'utf8'))
      for (const [key, value] of Object.entries(parsed)) {
        if (!env[key]) env[key] = value
      }
    }
  }
  normalizeKeyAliases(env)
}

export function xaiApiKey(env: NodeJS.ProcessEnv = process.env): string | undefined {
  for (const key of GROK_KEY_ALIASES) {
    const value = env[key]?.trim()
    if (value) return value
  }
  return undefined
}

export function xBearerToken(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return env.X_BEARER_TOKEN?.trim() || env.X_API_BEARER_TOKEN?.trim() || undefined
}

export function googleCseConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.GOOGLE_API_KEY?.trim() && env.GOOGLE_CSE_ID?.trim())
}

export function corpusDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url))
  return path.resolve(here, '../mined data')
}
