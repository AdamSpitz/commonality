import type { MinedExample } from './extract.js'

export const GEO_LEVELS = [
  'global',
  'national',
  'state-province',
  'county-parish',
  'town',
  'neighborhood',
] as const

export type GeoLevel = (typeof GEO_LEVELS)[number]

export interface GeoKind {
  id: GeoLevel
  label: string
  hint: string
  queryTerms: string
}

export const GEO_KINDS: GeoKind[] = [
  {
    id: 'global',
    label: 'Global',
    hint: 'Planet-wide or multi-country claims (UN, treaties, “every country”).',
    queryTerms: 'global OR worldwide OR international OR "united nations"',
  },
  {
    id: 'national',
    label: 'National',
    hint: 'Country-scale: federal law, nationwide policy, a named country.',
    queryTerms: 'national OR federal OR nationwide OR country',
  },
  {
    id: 'state-province',
    label: 'State / province',
    hint: 'State, province, or equivalent (statewide, provincial legislature).',
    queryTerms: 'state OR province OR statewide OR provincial',
  },
  {
    id: 'county-parish',
    label: 'County / parish',
    hint: 'County, civil parish, or equivalent local-government tier.',
    queryTerms: 'county OR parish OR "parish council" OR "county commission"',
  },
  {
    id: 'town',
    label: 'Town',
    hint: 'City or town: municipal council, mayor, named city.',
    queryTerms: 'city OR town OR municipal OR "city council"',
  },
  {
    id: 'neighborhood',
    label: 'Neighborhood',
    hint: 'Neighborhood, block, street, community board, or HOA.',
    queryTerms: 'neighborhood OR neighbourhood OR "community board" OR "block association"',
  },
]

export function isGeoLevel(value: string): value is GeoLevel {
  return (GEO_LEVELS as readonly string[]).includes(value)
}

export function geoFilterActive(levels: GeoLevel[]): boolean {
  return levels.length > 0 && levels.length < GEO_LEVELS.length
}

export function scopedQuery(query: string, levels: GeoLevel[]): string {
  const q = query.trim()
  if (!q || !geoFilterActive(levels)) return q
  const terms = levels
    .map((id) => GEO_KINDS.find((kind) => kind.id === id)?.queryTerms)
    .filter((term): term is string => Boolean(term))
  if (terms.length === 0) return q
  return `${q} (${terms.join(' OR ')})`
}

export function geoPromptBlock(levels: GeoLevel[]): string {
  if (!geoFilterActive(levels)) return ''
  const kinds = levels
    .map((id) => GEO_KINDS.find((kind) => kind.id === id))
    .filter((kind): kind is GeoKind => Boolean(kind))
  const labels = kinds.map((kind) => kind.label).join(', ')
  const hints = kinds.map((kind) => `- ${kind.label}: ${kind.hint}`).join('\n')
  return `Geographic scale: only ${labels}.
${hints}
Skip claims at other geographic scales. Prefer named places at the selected scale.`
}

const INFER_PATTERNS: Array<{ id: GeoLevel; re: RegExp }> = [
  {
    id: 'neighborhood',
    re: /\b(neighborhood|neighbourhood|block association|homeowners association|\bhoa\b|community board|this block|our street|on my (block|street))\b/i,
  },
  {
    id: 'town',
    re: /\b(city of|town of|city council|town council|municipal|mayor of|this town|this city|downtown)\b/i,
  },
  {
    id: 'county-parish',
    re: /\b((county|parish) (commission|council|board|government)|civil parish|\bcounty\b|\bparish\b)\b/i,
  },
  {
    id: 'state-province',
    re: /\b(statewide|province of|provincial|state legislature|governor of|commonwealth of|state of [A-Z])\b/,
  },
  {
    id: 'national',
    re: /\b(federal|nationwide|national|congress|parliament|this country|united states|americans|canadians|the nation)\b/i,
  },
  {
    id: 'global',
    re: /\b(worldwide|global|international|united nations|\bun\b|all countries|the planet|humanity|every country)\b/i,
  },
]

export function inferGeoLevel(text: string): GeoLevel | null {
  for (const row of INFER_PATTERNS) {
    if (row.re.test(text)) return row.id
  }
  return null
}

export function applyGeoFilter(examples: MinedExample[], levels: GeoLevel[]): MinedExample[] {
  const active = geoFilterActive(levels)
  const out: MinedExample[] = []
  for (const example of examples) {
    const geoLevel = example.geoLevel ?? inferGeoLevel(example.text) ?? undefined
    if (active && geoLevel && !levels.includes(geoLevel)) continue
    out.push({ ...example, geoLevel })
  }
  return out
}
