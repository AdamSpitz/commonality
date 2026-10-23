/**
 * Reader model for a published bridge cluster: one row per camp, plank text
 * resolved, pairs grouped under the side they come from.
 */

import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { BridgeClusterFields, CauseRef, ImplicationPairRole } from './bridgeCluster'
import { loadPlankTexts, loadRosterDocument, resolveRosterCid, stableCausePath } from './causeRoster'

export interface CauseSnapshot {
  owner: `0x${string}`
  slug: string
  /** Empty until the roster loads. */
  title: string
  summary: string
  plankCids: string[]
  planks: Array<{ cid: string; text: string }>
  /** First plank body, or empty when it could not be read. */
  featuredPlank: string
}

export interface PairLine {
  role: ImplicationPairRole
  fromCid: string
  toCid: string
  fromText: string
  toText: string
  attested: boolean
}

export interface CampStory {
  id: string
  shortName: string
  naturalTitle: string
  modifiedTitle: string
  natural: Array<{ cid: string; text: string }>
  modified: Array<{ cid: string; text: string }>
  /** Parent statement → modified statement. A suggestion, not an implication. */
  nudges: Array<{ fromCid: string; toCid: string; fromText: string; toText: string }>
  /** Modified (or natural, when there is no modified wording) → common ground. */
  implications: Array<{ fromCid: string; toCid: string; fromText: string; toText: string; attested: boolean }>
  /** Stable path to the parent cause board. */
  parentCausePath: string
  /** Stable path to the modified cause board, if any. */
  modifiedCausePath: string | null
}

export interface CampRow {
  parent: CauseSnapshot
  modified: CauseSnapshot | null
  pairs: PairLine[]
}

export interface ClusterLayout {
  bridge: CauseSnapshot
  camps: CampRow[]
  loosePairs: PairLine[]
}

export function causeKey(ref: Pick<CauseRef, 'owner' | 'slug'>): string {
  return `${ref.owner.toLowerCase()}:${ref.slug}`
}

export function pairKey(fromCid: string, toCid: string): string {
  return `${fromCid}\0${toCid}`
}

export function pairRoleLabel(role: ImplicationPairRole): string {
  switch (role) {
    case 'modified-to-parent':
      return 'Still supports the original cause'
    case 'modified-to-bridge':
    case 'parent-to-bridge':
      return 'Supports the shared bridge'
  }
}

function snapshotOrFallback(
  ref: CauseRef,
  snapshots: Map<string, CauseSnapshot>,
): CauseSnapshot {
  return snapshots.get(causeKey(ref)) ?? {
    owner: ref.owner,
    slug: ref.slug,
    title: '',
    summary: '',
    plankCids: [],
    planks: [],
    featuredPlank: '',
  }
}

const SLUG_NOISE = new Set([
  'bridge', 'cluster', 'modified', 'natural', 'cause', 'network', 'societies', 'trial', 'checkout', 'v1', 'b2',
])

/** A short camp label such as "Left", taken from the slug tail when the title is a long sentence. */
export function campShortName(slug: string, title: string, index: number): string {
  const parts = slug.split('-').filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i]!
    if (SLUG_NOISE.has(part) || /^\d+$/.test(part) || part.length > 18) continue
    return part.charAt(0).toUpperCase() + part.slice(1)
  }
  const trimmed = title.trim()
  if (trimmed && trimmed.length <= 28) return trimmed
  return `Camp ${index + 1}`
}

function displayText(cid: string, texts: Map<string, string>): string {
  const text = texts.get(cid)?.trim()
  if (!text || text === cid) return `${cid.slice(0, 12)}…`
  return text
}

export function layoutCluster(
  fields: BridgeClusterFields,
  snapshots: Map<string, CauseSnapshot>,
  texts: Map<string, string>,
  attested: Set<string>,
): ClusterLayout {
  const camps: CampRow[] = fields.parents.map((parent) => {
    const modified = fields.modified.find((item) => (
      item.parentOwner.toLowerCase() === parent.owner.toLowerCase() && item.parentSlug === parent.slug
    )) ?? null
    return {
      parent: snapshotOrFallback(parent, snapshots),
      modified: modified ? snapshotOrFallback(modified, snapshots) : null,
      pairs: [],
    }
  })

  const loosePairs: PairLine[] = []
  for (const pair of fields.pairs) {
    const line: PairLine = {
      role: pair.role,
      fromCid: pair.fromCid,
      toCid: pair.toCid,
      fromText: displayText(pair.fromCid, texts),
      toText: displayText(pair.toCid, texts),
      attested: attested.has(pairKey(pair.fromCid, pair.toCid)),
    }
    const camp = camps.find((row) => {
      const modifiedHit = row.modified?.plankCids.includes(pair.fromCid)
      const parentHit = row.parent.plankCids.includes(pair.fromCid)
      if (pair.role === 'parent-to-bridge') return parentHit
      return Boolean(modifiedHit) || parentHit
    })
    if (camp) camp.pairs.push(line)
    else loosePairs.push(line)
  }

  return {
    bridge: snapshotOrFallback(fields.bridge, snapshots),
    camps,
    loosePairs,
  }
}

function plankText(planks: Array<{ cid: string; text: string }>, cid: string, fallback: string): string {
  return planks.find((plank) => plank.cid === cid)?.text.trim() || fallback
}

/** One story per camp: natural wording, a suggested rewording, and what that implies. */
export function campStories(layout: ClusterLayout): CampStory[] {
  return layout.camps.map((row, index) => {
    const natural = row.parent.planks.filter((plank) => plank.text.trim())
    const modified = row.modified?.planks.filter((plank) => plank.text.trim()) ?? []
    const nudgesFromPairs = row.pairs
      .filter((pair) => pair.role === 'modified-to-parent')
      .map((pair) => ({
        fromCid: pair.toCid,
        toCid: pair.fromCid,
        fromText: pair.toText,
        toText: pair.fromText,
      }))
    const zipped = modified.length === 1
      ? natural.map((plank) => ({ from: plank, to: modified[0]! }))
      : natural.slice(0, modified.length).map((plank, i) => ({ from: plank, to: modified[i]! }))
    const nudges = nudgesFromPairs.length > 0
      ? nudgesFromPairs
      : zipped.map(({ from, to }) => ({
        fromCid: from.cid,
        toCid: to.cid,
        fromText: from.text,
        toText: to.text,
      }))
    const implicationPairs = row.pairs.filter((pair) => (
      pair.role === 'modified-to-bridge' || (pair.role === 'parent-to-bridge' && modified.length === 0)
    ))
    return {
      id: `${row.parent.owner}/${row.parent.slug}`,
      shortName: campShortName(row.parent.slug, row.parent.title, index),
      naturalTitle: row.parent.title.trim() || campShortName(row.parent.slug, '', index),
      modifiedTitle: row.modified?.title.trim() || '',
      natural,
      modified,
      nudges,
      implications: implicationPairs.map((pair) => ({
        fromCid: pair.fromCid,
        toCid: pair.toCid,
        fromText: plankText(modified.length ? modified : natural, pair.fromCid, pair.fromText),
        toText: plankText(layout.bridge.planks, pair.toCid, pair.toText),
        attested: pair.attested,
      })),
      parentCausePath: stableCausePath(row.parent),
      modifiedCausePath: row.modified ? stableCausePath(row.modified) : null,
    }
  })
}

export async function loadCauseSnapshot(
  machinery: SDKMachinery,
  ref: CauseRef,
): Promise<CauseSnapshot> {
  const empty: CauseSnapshot = {
    owner: ref.owner,
    slug: ref.slug,
    title: '',
    summary: '',
    plankCids: [],
    planks: [],
    featuredPlank: '',
  }
  try {
    const cid = await resolveRosterCid(machinery, ref.owner, ref.slug)
    if (!cid) return empty
    const loaded = await loadRosterDocument(machinery, cid)
    if (!loaded) return empty
    const texts = await loadPlankTexts(machinery, loaded.fields.plankCids)
    const planks = loaded.fields.plankCids.map((plankCid) => {
      const body = texts.get(plankCid)?.trim() ?? ''
      return { cid: plankCid, text: body && body !== plankCid ? body : '' }
    })
    return {
      owner: ref.owner,
      slug: ref.slug,
      title: loaded.fields.title,
      summary: loaded.fields.summary,
      plankCids: [...loaded.fields.plankCids],
      planks,
      featuredPlank: planks.find((plank) => plank.text)?.text ?? '',
    }
  } catch {
    return empty
  }
}
