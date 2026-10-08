import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { googleCseConfigured, xaiApiKey, xBearerToken } from './env.js'
import { extractFromText, stripHtml, type MinedExample } from './extract.js'
import { applyGeoFilter, isGeoLevel, scopedQuery, type GeoLevel } from './geo.js'
import { xaiGrokMine, xaiLiveSearch } from './xaiSearch.js'
import type { ArtifactType } from './artifacts.js'

export interface SourceKind {
  id: string
  label: string
  hint: string
  needsQuery: boolean
  configured: boolean
}

export interface SourceHit {
  title: string
  url?: string
  text: string
}

export interface MineRequest {
  query: string
  types: ArtifactType[]
  sources: string[]
  url?: string
  limit?: number
  geoLevels?: GeoLevel[]
}

const UA = 'CommonalityDataMining/0.1 (local research workbench)'

export function configuredSources(env: NodeJS.ProcessEnv = process.env): SourceKind[] {
  const nativeX = Boolean(xBearerToken(env))
  const nativeGoogle = googleCseConfigured(env)
  const xai = Boolean(xaiApiKey(env))
  return [
    {
      id: 'x',
      label: 'X',
      hint: nativeX
        ? 'Recent posts via the X API v2 (X_BEARER_TOKEN).'
        : xai
          ? 'Live X search via xAI x_search. Native X_BEARER_TOKEN not set.'
          : 'Needs X_BEARER_TOKEN / X_API_BEARER_TOKEN, or grok_api_key / XAI_API_KEY for xAI x_search.',
      needsQuery: true,
      configured: nativeX || xai,
    },
    {
      id: 'google',
      label: 'Google Search',
      hint: nativeGoogle
        ? 'Custom Search JSON API (GOOGLE_API_KEY + GOOGLE_CSE_ID).'
        : xai
          ? 'Web search via xAI web_search. Native Google CSE not set.'
          : 'Needs GOOGLE_API_KEY + GOOGLE_CSE_ID, or grok_api_key / XAI_API_KEY for xAI web_search.',
      needsQuery: true,
      configured: nativeGoogle || xai,
    },
    {
      id: 'grok',
      label: 'Grok',
      hint: xai
        ? 'Ask Grok for published civic claims it already knows (no live X/web search).'
        : 'Needs grok_api_key / XAI_API_KEY / GROK_API_KEY.',
      needsQuery: true,
      configured: xai,
    },
    {
      id: 'duckduckgo',
      label: 'DuckDuckGo',
      hint: 'HTML web search. No key. Use when Google is not configured.',
      needsQuery: true,
      configured: true,
    },
    {
      id: 'wikipedia',
      label: 'Wikipedia',
      hint: 'MediaWiki search + page extract. No key.',
      needsQuery: true,
      configured: true,
    },
    {
      id: 'web-url',
      label: 'Open URL',
      hint: 'Fetch one page and mine it. Paste a URL.',
      needsQuery: false,
      configured: true,
    },
    {
      id: 'local-corpus',
      label: 'Local corpus',
      hint: 'Search the existing files under mined data/. Always available.',
      needsQuery: true,
      configured: true,
    },
  ]
}

async function fetchText(url: string, headers: Record<string, string> = {}): Promise<string> {
  const response = await fetch(url, {
    headers: { 'user-agent': UA, ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) {
    throw new Error(`${url} → HTTP ${response.status}`)
  }
  return response.text()
}

async function mineWikipedia(query: string, types: ArtifactType[]): Promise<MinedExample[]> {
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=1&format=json&origin=*`
  const searchJson = JSON.parse(await fetchText(searchUrl)) as {
    query?: { search?: Array<{ title: string }> }
  }
  const titles = (searchJson.query?.search ?? []).slice(0, 4).map((row) => row.title)
  const out: MinedExample[] = []
  for (const title of titles) {
    const pageUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&titles=${encodeURIComponent(title)}&format=json&origin=*`
    const pageJson = JSON.parse(await fetchText(pageUrl)) as {
      query?: { pages?: Record<string, { extract?: string; title?: string }> }
    }
    const page = Object.values(pageJson.query?.pages ?? {})[0]
    const text = page?.extract ?? ''
    const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
    out.push(...extractFromText(text, {
      types,
      sourceId: 'wikipedia',
      sourceName: `Wikipedia: ${title}`,
      url,
    }))
  }
  return out
}

async function mineDuckDuckGo(query: string, types: ArtifactType[]): Promise<MinedExample[]> {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`)
  const links = [...html.matchAll(/uddg=([^&"]+)/g)]
    .map((m) => {
      try { return decodeURIComponent(m[1] ?? '') } catch { return '' }
    })
    .filter((url) => url.startsWith('http'))
  const unique = [...new Set(links)].slice(0, 4)
  const out: MinedExample[] = []
  for (const url of unique) {
    try {
      const page = stripHtml(await fetchText(url))
      out.push(...extractFromText(page.slice(0, 20_000), {
        types,
        sourceId: 'duckduckgo',
        sourceName: 'DuckDuckGo',
        url,
      }))
    } catch {
      // skip unreachable pages
    }
  }
  return out
}

async function mineGoogle(
  query: string,
  types: ArtifactType[],
  env: NodeJS.ProcessEnv,
  geoLevels: GeoLevel[],
): Promise<MinedExample[]> {
  const key = env.GOOGLE_API_KEY?.trim()
  const cx = env.GOOGLE_CSE_ID?.trim()
  if (!key || !cx) {
    if (xaiApiKey(env)) {
      return xaiLiveSearch({
        env,
        tool: 'web_search',
        query,
        types,
        sourceId: 'google',
        sourceName: 'Google (xAI web_search)',
        geoLevels,
      })
    }
    throw new Error('Google Search is not configured (GOOGLE_API_KEY + GOOGLE_CSE_ID, or grok_api_key / XAI_API_KEY).')
  }
  const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(scopedQuery(query, geoLevels))}`
  const json = JSON.parse(await fetchText(url)) as {
    items?: Array<{ title?: string; link?: string; snippet?: string }>
  }
  const out: MinedExample[] = []
  for (const item of (json.items ?? []).slice(0, 6)) {
    const pageUrl = item.link
    const snippet = [item.title, item.snippet].filter(Boolean).join('. ')
    if (pageUrl) {
      try {
        const page = stripHtml(await fetchText(pageUrl)).slice(0, 20_000)
        out.push(...extractFromText(`${snippet}. ${page}`, {
          types,
          sourceId: 'google',
          sourceName: `Google: ${item.title ?? pageUrl}`,
          url: pageUrl,
        }))
        continue
      } catch {
        // fall through to snippet-only
      }
    }
    out.push(...extractFromText(snippet, {
      types,
      sourceId: 'google',
      sourceName: `Google: ${item.title ?? 'result'}`,
      url: pageUrl,
    }))
  }
  return out
}

async function mineX(
  query: string,
  types: ArtifactType[],
  env: NodeJS.ProcessEnv,
  geoLevels: GeoLevel[],
): Promise<MinedExample[]> {
  const token = xBearerToken(env)
  if (!token) {
    if (xaiApiKey(env)) {
      return xaiLiveSearch({
        env,
        tool: 'x_search',
        query,
        types,
        sourceId: 'x',
        sourceName: 'X (xAI x_search)',
        geoLevels,
      })
    }
    throw new Error('X is not configured (X_BEARER_TOKEN, or grok_api_key / XAI_API_KEY).')
  }
  const url = `https://api.x.com/2/tweets/search/recent?query=${encodeURIComponent(scopedQuery(query, geoLevels))}&max_results=20&tweet.fields=text,author_id,created_at`
  const json = JSON.parse(await fetchText(url, { authorization: `Bearer ${token}` })) as {
    data?: Array<{ id: string; text: string }>
  }
  const out: MinedExample[] = []
  for (const tweet of json.data ?? []) {
    out.push(...extractFromText(tweet.text, {
      types,
      sourceId: 'x',
      sourceName: 'X',
      url: `https://x.com/i/web/status/${tweet.id}`,
    }))
  }
  return out
}

async function mineUrl(pageUrl: string, types: ArtifactType[]): Promise<MinedExample[]> {
  if (!/^https?:\/\//i.test(pageUrl)) throw new Error('Open URL needs an http(s) address.')
  const html = await fetchText(pageUrl)
  const text = stripHtml(html).slice(0, 40_000)
  return extractFromText(text, {
    types,
    sourceId: 'web-url',
    sourceName: pageUrl,
    url: pageUrl,
  })
}

function mineLocalCorpus(query: string, types: ArtifactType[], corpusDir: string): MinedExample[] {
  const files = ['causestarter-statement-examples.md', 'statement-rewrites.md']
  const needle = query.trim().toLowerCase()
  const out: MinedExample[] = []
  for (const file of files) {
    const full = path.join(corpusDir, file)
    if (!existsSync(full)) continue
    const body = readFileSync(full, 'utf8')
    const rows = body.split('\n').filter((line) => {
      if (!line.startsWith('|')) return false
      if (!needle) return true
      return line.toLowerCase().includes(needle)
    })
    for (const row of rows) {
      const cells = row.split('|').map((c) => c.trim()).filter(Boolean)
      const typeCell = cells[1]
      const text = cells[2]
      if (!text || text === 'text' || text.startsWith('URL:')) continue
      const type = (types as string[]).includes(typeCell ?? '') ? (typeCell as ArtifactType) : types[0]
      if (!type) continue
      out.push({
        type,
        text,
        sourceId: 'local-corpus',
        sourceName: file,
        excerpt: row.slice(0, 240),
      })
      if (out.length >= 40) return out
    }
  }
  return out
}

export async function mine(request: MineRequest, options: {
  env?: NodeJS.ProcessEnv
  corpusDir: string
}): Promise<{ examples: MinedExample[]; errors: string[] }> {
  const env = options.env ?? process.env
  const types = request.types
  const query = request.query.trim()
  const geoLevels = (request.geoLevels ?? []).filter((value): value is GeoLevel => (
    typeof value === 'string' && isGeoLevel(value)
  ))
  const searchQuery = scopedQuery(query, geoLevels)
  const limit = Math.min(80, Math.max(1, request.limit ?? 40))
  const errors: string[] = []
  const examples: MinedExample[] = []

  for (const sourceId of request.sources) {
    try {
      if (sourceId === 'wikipedia') {
        if (!query) throw new Error('Wikipedia needs a search query.')
        examples.push(...await mineWikipedia(searchQuery, types))
      } else if (sourceId === 'duckduckgo') {
        if (!query) throw new Error('DuckDuckGo needs a search query.')
        examples.push(...await mineDuckDuckGo(searchQuery, types))
      } else if (sourceId === 'google') {
        if (!query) throw new Error('Google Search needs a search query.')
        examples.push(...await mineGoogle(query, types, env, geoLevels))
      } else if (sourceId === 'x') {
        if (!query) throw new Error('X needs a search query.')
        examples.push(...await mineX(query, types, env, geoLevels))
      } else if (sourceId === 'grok') {
        if (!query) throw new Error('Grok needs a search query.')
        examples.push(...await xaiGrokMine({ env, query, types, geoLevels }))
      } else if (sourceId === 'web-url') {
        examples.push(...await mineUrl(request.url?.trim() || query, types))
      } else if (sourceId === 'local-corpus') {
        examples.push(...mineLocalCorpus(query, types, options.corpusDir))
      } else {
        errors.push(`Unknown source: ${sourceId}`)
      }
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
    }
  }

  const seen = new Set<string>()
  const unique: MinedExample[] = []
  for (const example of applyGeoFilter(examples, geoLevels)) {
    const key = `${example.type}:${example.text.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(example)
    if (unique.length >= limit) break
  }
  return { examples: unique, errors }
}
