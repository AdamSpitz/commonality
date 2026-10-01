/**
 * Rewrites descriptions already published by the medium-realistic campaign.
 * Later campaign runs store the friend-facing sentence directly.
 */
export const FAKE_DATA_NOTE = '(This is fake data created for testing.)'

const CAUSE_TITLES: Record<string, string> = {
  'open-source': 'Open-source public infrastructure',
  'local-food': 'Local food systems',
  'open-science': 'Open and trustworthy science',
  education: 'Education and literacy',
  environment: 'Environmental resilience',
  'digital-rights': 'Digital rights and civic infrastructure',
  'abortion-common-ground': 'Abortion common ground',
  'immigration-common-ground': 'Immigration common ground',
  'violent-crime-common-ground': 'Violent crime common ground',
  'schools-common-ground': 'Schools and LGBT common ground',
}

function withNote(body: string): string {
  const trimmed = body.trim().replace(/\.$/, '')
  return trimmed.includes(FAKE_DATA_NOTE) ? trimmed : `${trimmed}. ${FAKE_DATA_NOTE}`
}

const SLUG_SUFFIXES = ['-left-modified', '-right-modified', '-cluster', '-bridge', '-left', '-right']

function causeIdFromCampaignSlug(value: string): string | undefined {
  const match = value.match(/^(?:campaign-)?medium-realistic-v1-(.+)$/)
  if (!match) return undefined
  let id = match[1]
  for (const suffix of SLUG_SUFFIXES) {
    if (id.endsWith(suffix)) {
      id = id.slice(0, -suffix.length)
      break
    }
  }
  return id
}

/** Published campaign boards stored the cause id or ref slug as the title. */
export function presentCampaignTitle(title: string): string {
  const direct = CAUSE_TITLES[title]
  if (direct) return direct
  const fromSlug = causeIdFromCampaignSlug(title)
  const mapped = fromSlug ? CAUSE_TITLES[fromSlug] : undefined
  return mapped ?? title
}

function supporting(title: string): string {
  const sentence = title.charAt(0).toLowerCase() + title.slice(1)
  return `Cause board supporting ${sentence}. ${FAKE_DATA_NOTE}`
}

/** Turn a published campaign summary into a sentence a new reader can follow. */
export function presentCampaignSummary(summary: string | undefined): string | undefined {
  if (!summary) return summary
  if (summary.includes(FAKE_DATA_NOTE)) return summary
  const bare = summary.match(/^SYNTHETIC TESTNET CAMPAIGN cause ([a-z0-9-]+)$/)
  if (bare) {
    const title = CAUSE_TITLES[bare[1]] ?? bare[1].replace(/-/g, ' ')
    return supporting(title)
  }
  const labeled = summary.match(/^SYNTHETIC TESTNET CAMPAIGN\. (.+)$/s)
  if (labeled) return withNote(labeled[1])
  if (summary.startsWith('SYNTHETIC TESTNET CAMPAIGN')) return withNote(summary.replace(/^SYNTHETIC TESTNET CAMPAIGN\W*/, ''))
  return summary
}

export function presentCampaignProjectDescription(
  description: string | undefined,
  synthetic: boolean,
): string | undefined {
  if (!description) return description
  if (!synthetic || description.includes(FAKE_DATA_NOTE)) return description
  return `${description.trim().replace(/\.$/, '')}. ${FAKE_DATA_NOTE}`
}
