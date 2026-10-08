import type { ArtifactType } from './artifacts.js'
import type { GeoLevel } from './geo.js'

export interface MinedExample {
  type: ArtifactType
  text: string
  sourceId: string
  sourceName: string
  url?: string
  excerpt?: string
  notes?: string
  geoLevel?: GeoLevel
}

export interface ExtractOptions {
  types: ArtifactType[]
  sourceId: string
  sourceName: string
  url?: string
}

const QUESTION_START = /^(how |what |when |where |why |which |who |do you |would you |in your )/i
const SLOGAN = /^[A-Z0-9][A-Z0-9 ,'!?.-]{8,}$/
const SKIP = /cookie|subscribe|sign in|privacy policy|javascript is disabled/i

function cleanLine(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(/^[-*•\d.)\s]+/, '').trim()
}

function looksSignable(text: string): boolean {
  if (text.length < 24 || text.length > 420) return false
  if (QUESTION_START.test(text)) return false
  if (SLOGAN.test(text) && text === text.toUpperCase()) return false
  if (SKIP.test(text)) return false
  if (!/[.!?]"?$/.test(text) && !/^(I |We |Everyone |The |A |This )/i.test(text)) {
    if (text.split(' ').length < 6) return false
  }
  return true
}

export function classifyText(text: string, allowed: ArtifactType[]): ArtifactType | null {
  const t = text.trim()
  const want = /^I want\b/i.test(t) || /^We want\b/i.test(t)
  const belief = /^I believe\b/i.test(t) || /\bshould\b/i.test(t) || /^Everyone should\b/i.test(t)
  const weWill = /^We will\b/i.test(t) || /^I commit\b/i.test(t)
  const project = /\b(project|garden|library|protocol|app|tooling)\b/i.test(t) && /\b(build|built|create|maintain)\b/i.test(t)
  const causeTitle = t.length <= 90 && !want && /cause|campaign|plan|platform|pledge|levy|proposition/i.test(t)

  const ranked: ArtifactType[] = []
  if (project) ranked.push('project')
  if (want) ranked.push('goal', 'plank')
  if (weWill) ranked.push('plank', 'goal')
  if (belief && !want) ranked.push('belief')
  if (causeTitle) ranked.push('cause')
  ranked.push('plank', 'statement', 'belief', 'goal')

  for (const type of ranked) {
    if (allowed.includes(type)) return type
  }
  return allowed[0] ?? null
}

export function extractFromText(body: string, options: ExtractOptions): MinedExample[] {
  const lines = body
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z"“I])/)
    .map(cleanLine)
    .filter(Boolean)

  const seen = new Set<string>()
  const out: MinedExample[] = []
  for (const line of lines) {
    if (!looksSignable(line)) continue
    const key = line.toLowerCase()
    if (seen.has(key)) continue
    const type = classifyText(line, options.types)
    if (!type) continue
    seen.add(key)
    out.push({
      type,
      text: line,
      sourceId: options.sourceId,
      sourceName: options.sourceName,
      url: options.url,
      excerpt: line,
    })
    if (out.length >= 40) break
  }
  return out
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()
}
