import type { ArtifactType } from './artifacts.js'
import { xaiApiKey } from './env.js'
import { extractFromText, type MinedExample } from './extract.js'
import { geoPromptBlock, type GeoLevel } from './geo.js'

const XAI_RESPONSES_URL = 'https://api.x.ai/v1/responses'
const DEFAULT_MODEL = 'grok-4.6'

export type LiveSearchTool = 'x_search' | 'web_search'

interface ClaimLine {
  text: string
  url?: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function pushUrl(urls: string[], value: unknown): void {
  if (typeof value !== 'string') return
  const url = value.trim()
  if (!/^https?:\/\//i.test(url)) return
  if (!urls.includes(url)) urls.push(url)
}

export function collectResponseText(json: Record<string, unknown>): string {
  if (typeof json.output_text === 'string' && json.output_text.trim()) {
    return json.output_text
  }
  const chunks: string[] = []
  for (const item of Array.isArray(json.output) ? json.output : []) {
    const row = asRecord(item)
    if (!row) continue
    if (typeof row.content === 'string') chunks.push(row.content)
    for (const part of Array.isArray(row.content) ? row.content : []) {
      const piece = asRecord(part)
      if (typeof piece?.text === 'string') chunks.push(piece.text)
    }
  }
  return chunks.join('\n')
}

export function collectResponseUrls(json: Record<string, unknown>): string[] {
  const urls: string[] = []
  if (Array.isArray(json.citations)) {
    for (const citation of json.citations) {
      if (typeof citation === 'string') pushUrl(urls, citation)
      else pushUrl(urls, asRecord(citation)?.url)
    }
  }
  for (const item of Array.isArray(json.output) ? json.output : []) {
    const row = asRecord(item)
    if (!row) continue
    for (const part of Array.isArray(row.content) ? row.content : []) {
      const piece = asRecord(part)
      for (const annotation of Array.isArray(piece?.annotations) ? piece.annotations : []) {
        pushUrl(urls, asRecord(annotation)?.url)
      }
    }
  }
  return urls
}

export function parseClaimLines(text: string): ClaimLine[] {
  const out: ClaimLine[] = []
  for (const raw of text.split(/\n+/)) {
    let line = raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim()
    if (!line) continue
    line = line.replace(/^["“]|["”]$/g, '').trim()
    const md = line.match(/^(.+?)\s*\((https?:\/\/[^\s)]+)\)\s*$/)
    const pipe = line.match(/^(.+?)\s+[|—]\s+(https?:\/\/\S+)\s*$/)
    const trailing = line.match(/^(.+?)\s+(https?:\/\/\S+)\s*$/)
    let claim = line
    let url: string | undefined
    if (md) {
      claim = md[1] ?? line
      url = md[2]
    } else if (pipe) {
      claim = pipe[1] ?? line
      url = pipe[2]
    } else if (trailing && (trailing[1] ?? '').split(/\s+/).length >= 5) {
      claim = trailing[1] ?? line
      url = trailing[2]
    }
    claim = claim.replace(/^["“]|["”]$/g, '').replace(/\s+/g, ' ').trim()
    if (!claim || /^https?:\/\//i.test(claim)) continue
    out.push({ text: claim, url })
  }
  return out
}

function withGeo(prompt: string, geoLevels?: GeoLevel[]): string {
  const block = geoPromptBlock(geoLevels ?? [])
  return block ? `${prompt}\n\n${block}` : prompt
}

function liveSearchPrompt(query: string, tool: LiveSearchTool, geoLevels?: GeoLevel[]): string {
  const where = tool === 'x_search'
    ? 'Search X (Twitter) for recent posts'
    : 'Search the public web (Google-style web results)'
  return withGeo(`${where} about: ${query}

Return 8–20 verbatim 1–2 sentence civic claims that a person could sign — wants, beliefs, planks, goals, or named causes. Copy wording from the source; do not invent slogans or party captions.

Rules:
- One claim per line.
- No questionnaire stems (How/What/Would you…).
- No ALL CAPS slogans.
- Keep place names, numbers, and dates when the source has them.
- After each claim, if you have a source URL, write: CLAIM | https://...
- Do not add commentary, headings, or numbering beyond the claim lines.`, geoLevels)
}

function grokKnowledgePrompt(query: string, geoLevels?: GeoLevel[]): string {
  return withGeo(`Mine real-world civic claims about: ${query}

Quote 8–20 published 1–2 sentence claims a person could sign — wants, beliefs, planks, goals, or named causes. Prefer wording from party platforms, city plans, charters, org missions, ballot measures, and well-known public statements. Copy closely; do not invent slogans or party captions.

Rules:
- One claim per line.
- No questionnaire stems (How/What/Would you…).
- No ALL CAPS slogans.
- Keep place names, numbers, and dates when the source has them.
- After each claim, if you know a source URL, write: CLAIM | https://...
- Do not add commentary, headings, or numbering beyond the claim lines.`, geoLevels)
}

async function xaiCollectClaims(options: {
  env: NodeJS.ProcessEnv
  query: string
  types: ArtifactType[]
  sourceId: string
  sourceName: string
  prompt: string
  tools?: Array<{ type: string }>
  label: string
  timeoutMs: number
}): Promise<MinedExample[]> {
  const key = xaiApiKey(options.env)
  if (!key) {
    throw new Error('xAI is not configured (XAI_API_KEY / GROK_API_KEY / grok_api_key).')
  }
  const model = options.env.XAI_MODEL?.trim() || DEFAULT_MODEL
  const body: Record<string, unknown> = {
    model,
    input: [{ role: 'user', content: options.prompt }],
  }
  if (options.tools && options.tools.length > 0) {
    body.tools = options.tools
  }
  const response = await fetch(XAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs),
  })
  if (!response.ok) {
    throw new Error(`xAI ${options.label} → HTTP ${response.status}`)
  }
  const json = await response.json() as Record<string, unknown>
  const err = asRecord(json.error)
  if (typeof json.error === 'string') {
    throw new Error(`xAI ${options.label}: ${json.error}`)
  }
  if (err && typeof err.message === 'string') {
    throw new Error(`xAI ${options.label}: ${err.message}`)
  }
  const text = collectResponseText(json)
  if (!text.trim()) {
    throw new Error(`xAI ${options.label} returned no text.`)
  }
  const urls = collectResponseUrls(json)
  const fallbackUrl = urls[0]
  const lines = parseClaimLines(text)
  const seen = new Set<string>()
  const out: MinedExample[] = []
  for (const line of lines) {
    const extracted = extractFromText(line.text, {
      types: options.types,
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      url: line.url ?? fallbackUrl,
    })
    for (const example of extracted) {
      const dedupe = `${example.type}:${example.text.toLowerCase()}`
      if (seen.has(dedupe)) continue
      seen.add(dedupe)
      out.push(example)
    }
  }
  if (out.length === 0) {
    out.push(...extractFromText(text, {
      types: options.types,
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      url: fallbackUrl,
    }))
  }
  return out
}

export async function xaiLiveSearch(options: {
  env: NodeJS.ProcessEnv
  tool: LiveSearchTool
  query: string
  types: ArtifactType[]
  sourceId: string
  sourceName: string
  geoLevels?: GeoLevel[]
}): Promise<MinedExample[]> {
  return xaiCollectClaims({
    env: options.env,
    query: options.query,
    types: options.types,
    sourceId: options.sourceId,
    sourceName: options.sourceName,
    prompt: liveSearchPrompt(options.query, options.tool, options.geoLevels),
    tools: [{ type: options.tool }],
    label: options.tool,
    timeoutMs: 180_000,
  })
}

export async function xaiGrokMine(options: {
  env: NodeJS.ProcessEnv
  query: string
  types: ArtifactType[]
  geoLevels?: GeoLevel[]
}): Promise<MinedExample[]> {
  return xaiCollectClaims({
    env: options.env,
    query: options.query,
    types: options.types,
    sourceId: 'grok',
    sourceName: 'Grok',
    prompt: grokKnowledgePrompt(options.query, options.geoLevels),
    label: 'grok',
    timeoutMs: 90_000,
  })
}
