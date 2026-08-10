/**
 * Cause roster as a published, versioned artifact.
 *
 * A roster is all founder-authored display text for a cause page: title, summary,
 * ordered plank CIDs, and mediator blurb. Its PublishedData CID is the version ID;
 * a MutableRef `(founder, slug) → CID` is the stable ID used in the URL.
 *
 * See docs/founder/shaping-your-cause-statements.md § The roster is a publication.
 */

import { MutableRefUpdaterAbi, PublishedDataAbi } from '@commonality/sdk/abis'
import {
  createDefaultDocumentStore,
  createDisplayableDocument,
  publishedDataCidForDocument,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  getUserRef,
  getUserRefHistory,
  updateRef,
  type MutableRefUpdaterContract,
  type RefUpdate,
} from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { getRuntimeConfigValue } from './runtimeConfig'
import type { CauseDraft, CauseMediator } from './causeStore'
import { publishedPlanks } from './causeStore'

/** Structured payload stored in DisplayableDocument.extras. */
export const ROSTER_KIND = 'causestarter.roster' as const
export const ROSTER_SCHEMA_VERSION = 1 as const

/** Ref names reserved by the substrate; founders may not use these as slugs. */
export const RESERVED_REF_NAMES = new Set([
  'created-statements',
  'favorites',
  'bookmarks',
  'draft-post',
])

export interface RosterFields {
  title: string
  summary: string
  /** Ordered published plank CIDs — order is significant. */
  plankCids: string[]
  /** Founder-authored mediator copy (not chain addresses). */
  mediatorBlurb: string
}

export interface RosterExtras extends RosterFields {
  kind: typeof ROSTER_KIND
  version: typeof ROSTER_SCHEMA_VERSION
}

export interface StableCauseId {
  owner: `0x${string}`
  slug: string
}

export interface CauseRouteRef extends StableCauseId {
  /** When set, render this roster version instead of the ref tip. */
  versionCid?: string
}

export interface PublishRosterResult {
  rosterCid: string
  refTxHash: `0x${string}`
  publishTxHash: `0x${string}`
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const MAX_SLUG_LENGTH = 64
const MAX_TITLE_LENGTH = 120
const MAX_SUMMARY_LENGTH = 2000
const MAX_MEDIATOR_BLURB_LENGTH = 1000

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
}

export function validateSlug(slug: string): string | null {
  if (!slug) return 'Choose a URL slug for this cause.'
  if (slug.length > MAX_SLUG_LENGTH) return `Slug must be at most ${MAX_SLUG_LENGTH} characters.`
  if (!SLUG_PATTERN.test(slug)) {
    return 'Slug must be lowercase letters, numbers, and hyphens (no leading/trailing hyphen).'
  }
  if (RESERVED_REF_NAMES.has(slug)) {
    return `“${slug}” is reserved. Pick a different slug.`
  }
  return null
}

export function mediatorBlurbFrom(mediator: CauseMediator | undefined): string {
  if (!mediator) return ''
  const name = mediator.name.trim()
  const description = mediator.description.trim()
  if (name && description) return `${name}: ${description}`
  return name || description
}

/**
 * Build the founder-authored fields that go into a roster document.
 * Title falls back to the first published plank when the founder left it blank.
 */
export function rosterFieldsFromCause(cause: CauseDraft): RosterFields {
  const planks = publishedPlanks(cause)
  const firstText = planks[0]?.text.trim() ?? ''
  const title = (cause.title?.trim() || firstText || 'Untitled cause').slice(0, MAX_TITLE_LENGTH)
  return {
    title,
    summary: (cause.summary?.trim() ?? '').slice(0, MAX_SUMMARY_LENGTH),
    plankCids: planks.map((plank) => plank.cid!).filter(Boolean),
    mediatorBlurb: mediatorBlurbFrom(cause.mediator).slice(0, MAX_MEDIATOR_BLURB_LENGTH),
  }
}

/** Human-readable body; structured fields live in extras (also part of the CID). */
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

/** Pure would-be CID for preview-before-publish (no chain write). */
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

export function stableCausePath(id: StableCauseId, versionCid?: string): string {
  const base = `/cause/${id.owner}/${encodeURIComponent(id.slug)}`
  return versionCid ? `${base}@${versionCid}` : base
}

/**
 * Parse `/cause/:owner/:slug` or `/cause/:owner/:slug@cid` style params.
 * `slugPart` may already include a trailing `@versionCid`.
 */
export function parseCauseRouteParams(
  owner: string | undefined,
  slugPart: string | undefined,
): CauseRouteRef | null {
  if (!owner || !slugPart) return null
  if (!/^0x[0-9a-fA-F]{40}$/.test(owner)) return null

  const at = slugPart.lastIndexOf('@')
  let slug = slugPart
  let versionCid: string | undefined
  if (at > 0) {
    slug = slugPart.slice(0, at)
    versionCid = slugPart.slice(at + 1) || undefined
  }
  try {
    slug = decodeURIComponent(slug)
  } catch {
    return null
  }
  if (validateSlug(slug)) return null
  return {
    owner: owner.toLowerCase() as `0x${string}`,
    slug,
    versionCid,
  }
}

function contractsFromMachinery(machinery: SDKMachinery) {
  const addresses = machinery.contractAddresses
  const mutableRefAddress = (addresses?.mutableRefUpdater
    || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const publishedDataAddress = (addresses?.publishedData
    || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  return { mutableRefAddress, publishedDataAddress }
}

/**
 * Publish roster document via PublishedData, then point the stable ref at its CID.
 * Two transactions today (publish + updateRef); batching is a later optimization.
 */
export async function publishRoster(args: {
  machinery: SDKMachinery
  writeClients: WriteClients | null | undefined
  slug: string
  fields: RosterFields
}): Promise<PublishRosterResult> {
  const { machinery, writeClients, slug, fields } = args
  const slugError = validateSlug(slug)
  if (slugError) throw new Error(slugError)
  if (!writeClients) {
    throw new Error('Wallet is not ready. Connect your wallet and try again.')
  }
  if (fields.plankCids.length === 0) {
    throw new Error('Publish at least one issue before publishing the cause roster.')
  }

  const { mutableRefAddress, publishedDataAddress } = contractsFromMachinery(machinery)
  if (!mutableRefAddress || !publishedDataAddress) {
    throw new Error('Contract addresses are missing. Redeploy CauseStarter to refresh config.json.')
  }

  const doc = buildRosterDocument(fields)
  const store = createDefaultDocumentStore(machinery, {
    clients: writeClients,
    publishedDataContract: { address: publishedDataAddress, abi: PublishedDataAbi },
  })
  const published = await store.publish(doc)

  const mutableRefUpdater: MutableRefUpdaterContract = {
    address: mutableRefAddress,
    abi: MutableRefUpdaterAbi,
  }
  const refTxHash = await updateRef(writeClients, mutableRefUpdater, slug, published.cid)

  return {
    rosterCid: published.cid,
    publishTxHash: published.txHash,
    refTxHash,
  }
}

/** Resolve current roster CID from the stable ref, or null if unset. */
export async function resolveRosterCid(
  machinery: SDKMachinery,
  owner: string,
  slug: string,
): Promise<string | null> {
  const ref = await getUserRef(machinery, owner, slug)
  const value = ref?.value?.trim()
  return value || null
}

export async function loadRosterDocument(
  machinery: SDKMachinery,
  rosterCid: string,
): Promise<{ document: DisplayableDocument; fields: RosterFields } | null> {
  const store = createDefaultDocumentStore(machinery)
  const read = await store.read(rosterCid as never)
  if (read.status !== 'active') return null
  const fields = parseRosterDocument(read.document)
  if (!fields) return null
  return { document: read.document, fields }
}

export async function loadRosterHistory(
  machinery: SDKMachinery,
  owner: string,
  slug: string,
  limit = 50,
): Promise<RefUpdate[]> {
  return getUserRefHistory(machinery, owner, slug, limit)
}

/** Relative label like "3 days ago" for history UI. */
export function formatRosterAge(timestamp: string | number | Date, now = Date.now()): string {
  const ms = typeof timestamp === 'string' || typeof timestamp === 'number'
    ? new Date(timestamp).getTime()
    : timestamp.getTime()
  if (!Number.isFinite(ms)) return 'at an unknown time'
  const deltaSec = Math.max(0, Math.floor((now - ms) / 1000))
  if (deltaSec < 60) return 'just now'
  const minutes = Math.floor(deltaSec / 60)
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 60) return `${days} day${days === 1 ? '' : 's'} ago`
  const months = Math.floor(days / 30)
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} ago`
  const years = Math.floor(days / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/**
 * For each plank CID, the earliest roster version in history that included it.
 * Used for "added later" provenance markers.
 */
export function plankFirstSeenInHistory(
  history: RefUpdate[],
  loadFields: (cid: string) => RosterFields | null | Promise<RosterFields | null>,
): Promise<Map<string, RefUpdate>> {
  // Newest-first history from getUserRefHistory; walk oldest→newest for first seen.
  const chronological = [...history].reverse()
  return (async () => {
    const firstSeen = new Map<string, RefUpdate>()
    for (const update of chronological) {
      const fields = await loadFields(update.value)
      if (!fields) continue
      for (const cid of fields.plankCids) {
        if (!firstSeen.has(cid)) firstSeen.set(cid, update)
      }
    }
    return firstSeen
  })()
}
