/**
 * Load repo-root local secret files into process.env for LLM calls.
 *
 * Preferred local file: `.env.grok` (gitignored). Supports:
 *   XAI_API_KEY=...
 *   GROK_API_KEY=...
 *   grok_api_key=...
 *
 * Does not override keys already present in the environment.
 */

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const GROK_KEY_ALIASES = ['XAI_API_KEY', 'GROK_API_KEY', 'grok_api_key'] as const

function candidateRoots(): string[] {
  // cause-assist/src or cause-assist/dist → monorepo root is ../..
  const here = path.dirname(fileURLToPath(import.meta.url))
  const fromPackage = path.resolve(here, '../..')
  const cwd = process.cwd()
  // Prefer a directory that actually has .env.grok or .env.
  return [fromPackage, cwd, path.resolve(cwd, '..'), path.resolve(cwd, '../..')]
}

function resolveRoot(explicit?: string): string {
  if (explicit) return explicit
  for (const root of candidateRoots()) {
    if (existsSync(path.join(root, '.env.grok')) || existsSync(path.join(root, '.env'))) {
      return root
    }
  }
  return candidateRoots()[0]!
}

function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (key) out[key] = value
  }
  return out
}

function applyEnvFile(filePath: string, env: NodeJS.ProcessEnv): boolean {
  if (!existsSync(filePath)) return false
  const parsed = parseEnvFile(readFileSync(filePath, 'utf8'))
  for (const [key, value] of Object.entries(parsed)) {
    if (!value) continue
    if (env[key] === undefined || env[key] === '') {
      env[key] = value
    }
  }
  return true
}

/** Normalize grok/xAI key aliases onto XAI_API_KEY for the rest of the stack. */
export function normalizeGrokApiKeyAliases(env: NodeJS.ProcessEnv = process.env): void {
  if (env.XAI_API_KEY?.trim()) return
  for (const key of GROK_KEY_ALIASES) {
    if (key === 'XAI_API_KEY') continue
    const value = env[key]?.trim()
    if (value) {
      env.XAI_API_KEY = value
      return
    }
  }
}

/**
 * Load `.env.grok` (and optionally root `.env`) from the monorepo root.
 * Returns which files were applied.
 */
export function loadLocalEnv(options?: {
  env?: NodeJS.ProcessEnv
  root?: string
  /** Also load root `.env` after `.env.grok` (still no override of set keys). Default true. */
  includeRootEnv?: boolean
}): { loaded: string[] } {
  const env = options?.env ?? process.env
  const root = resolveRoot(options?.root)
  const includeRootEnv = options?.includeRootEnv ?? true
  const loaded: string[] = []

  // Prefer dedicated Grok secrets first so they win over empty placeholders in .env.
  // applyEnvFile only fills keys that are unset/empty — so .env.grok then .env is correct.
  const grokPath = path.join(root, '.env.grok')
  if (applyEnvFile(grokPath, env)) loaded.push(grokPath)

  if (includeRootEnv) {
    const rootEnvPath = path.join(root, '.env')
    if (applyEnvFile(rootEnvPath, env)) loaded.push(rootEnvPath)
  }

  normalizeGrokApiKeyAliases(env)
  return { loaded }
}
