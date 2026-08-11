/**
 * Pure roster document helpers shared with CauseStarter's CID preview.
 * Kept local so cause-assist can bind attest requests without importing the SPA.
 */

import {
  createDisplayableDocument,
  publishedDataCidForDocument,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'

export const ROSTER_KIND = 'causestarter.roster' as const
export const ROSTER_SCHEMA_VERSION = 1 as const

export interface RosterFields {
  title: string
  summary: string
  plankCids: string[]
  mediatorBlurb: string
}

export interface RosterExtras extends RosterFields {
  kind: typeof ROSTER_KIND
  version: typeof ROSTER_SCHEMA_VERSION
}

export function renderRosterContent(fields: RosterFields): string {
  const lines: string[] = [`# ${fields.title}`]
  if (fields.summary.trim()) {
    lines.push('', fields.summary.trim())
  }
  if (fields.plankCids.length > 0) {
    lines.push('', '## Issues')
    for (const cid of fields.plankCids) {
      lines.push(`- ${cid}`)
    }
  }
  if (fields.mediatorBlurb.trim()) {
    lines.push('', '## Mediator', fields.mediatorBlurb.trim())
  }
  return lines.join('\n')
}

export function buildRosterDocument(fields: RosterFields): DisplayableDocument {
  const extras: RosterExtras = {
    kind: ROSTER_KIND,
    version: ROSTER_SCHEMA_VERSION,
    title: fields.title,
    summary: fields.summary,
    plankCids: [...fields.plankCids],
    mediatorBlurb: fields.mediatorBlurb,
  }
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: renderRosterContent(fields),
    references: fields.plankCids.map((cid) => ({ cid, label: 'plank' })),
    extras: extras as unknown as Record<string, unknown>,
  })
}

/** Pure would-be CID — must match the published roster CID before we attest. */
export function previewRosterCid(fields: RosterFields): string {
  return publishedDataCidForDocument(buildRosterDocument(fields))
}

export function parseRosterDocument(doc: DisplayableDocument): RosterFields | null {
  const extras = doc.extras
  if (!extras || typeof extras !== 'object') return null
  if (extras.kind !== ROSTER_KIND) return null
  if (extras.version !== ROSTER_SCHEMA_VERSION) return null

  const title = typeof extras.title === 'string' ? extras.title : ''
  const summary = typeof extras.summary === 'string' ? extras.summary : ''
  const mediatorBlurb = typeof extras.mediatorBlurb === 'string' ? extras.mediatorBlurb : ''
  const plankCids = Array.isArray(extras.plankCids)
    ? extras.plankCids.filter((cid): cid is string => typeof cid === 'string' && cid.length > 0)
    : []

  if (!title.trim() && plankCids.length === 0) return null
  return { title, summary, plankCids, mediatorBlurb }
}
