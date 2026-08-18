/**
 * Bridge cluster as a published, versioned artifact.
 *
 * A cluster is n modified causes + one bridge cause, plus the intended
 * plank-to-plank implication pairs. Causes do not imply each other.
 *
 * See specs/product/bridge-causes.md.
 */

import {
  MutableRefUpdaterAbi,
  PublishedDataAbi,
} from '@commonality/sdk/abis'
import {
  createDefaultDocumentStore,
  createDisplayableDocument,
  publishedDataCidForDocument,
  toCanonicalJson,
  validateDisplayableDocument,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { getUserRef } from '@commonality/sdk/mutable-refs'
import type { WriteClients } from '@commonality/sdk/utils'
import { toHex } from 'viem'
import { getRuntimeConfigValue } from './runtimeConfig'
import {
  parseCauseRouteParams,
  sendCallsPreferAtomic,
  validateSlug,
  type ContractCall,
  type StableCauseId,
} from './causeRoster'

export const BRIDGE_CLUSTER_KIND = 'causestarter.bridge-cluster' as const
export const BRIDGE_CLUSTER_SCHEMA_VERSION = 1 as const

export type ImplicationPairRole = 'modified-to-bridge' | 'modified-to-parent'

export interface CauseRef {
  owner: `0x${string}`
  slug: string
}

export interface ModifiedCauseRef extends CauseRef {
  parentOwner: `0x${string}`
  parentSlug: string
}

export interface IntendedPair {
  fromCid: string
  toCid: string
  role: ImplicationPairRole
}

export interface BridgeClusterFields {
  /** Public mediator identity — never the natural-cause founder. */
  mediatorName: string
  mediatorNote: string
  mediatorAddress: `0x${string}`
  parents: CauseRef[]
  modified: ModifiedCauseRef[]
  bridge: CauseRef
  pairs: IntendedPair[]
}

export interface BridgeClusterExtras extends BridgeClusterFields {
  kind: typeof BRIDGE_CLUSTER_KIND
  version: typeof BRIDGE_CLUSTER_SCHEMA_VERSION
}

export interface PublishClusterResult {
  clusterCid: string
  refTxHash: `0x${string}`
  publishTxHash: `0x${string}`
  batched: boolean
}

const MAX_NAME = 120
const MAX_NOTE = 2000

export function isAddress(value: string): value is `0x${string}` {
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function parseCauseRef(value: unknown): CauseRef | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const owner = typeof record.owner === 'string' ? record.owner.trim() : ''
  const slug = typeof record.slug === 'string' ? record.slug.trim() : ''
  if (!isAddress(owner)) return null
  if (validateSlug(slug)) return null
  return { owner: owner.toLowerCase() as `0x${string}`, slug }
}

function parseModifiedRef(value: unknown): ModifiedCauseRef | null {
  const cause = parseCauseRef(value)
  if (!cause || !value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const parentOwner = typeof record.parentOwner === 'string' ? record.parentOwner.trim() : ''
  const parentSlug = typeof record.parentSlug === 'string' ? record.parentSlug.trim() : ''
  if (!isAddress(parentOwner)) return null
  if (validateSlug(parentSlug)) return null
  return {
    ...cause,
    parentOwner: parentOwner.toLowerCase() as `0x${string}`,
    parentSlug,
  }
}

function parsePair(value: unknown): IntendedPair | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const fromCid = typeof record.fromCid === 'string' ? record.fromCid.trim() : ''
  const toCid = typeof record.toCid === 'string' ? record.toCid.trim() : ''
  const role = record.role
  if (!fromCid || !toCid) return null
  if (role !== 'modified-to-bridge' && role !== 'modified-to-parent') return null
  return { fromCid, toCid, role }
}

export function validateClusterFields(fields: BridgeClusterFields): string | null {
  if (!fields.mediatorName.trim()) return 'Name the mediator. Authorship has to be loud.'
  if (!isAddress(fields.mediatorAddress)) return 'Mediator address must be a 0x-prefixed Ethereum address.'
  if (fields.parents.length === 0) return 'Point at least one natural parent cause.'
  if (fields.modified.length !== fields.parents.length) {
    return 'Each natural parent needs exactly one modified cause.'
  }
  for (const parent of fields.parents) {
    if (!isAddress(parent.owner) || validateSlug(parent.slug)) {
      return 'Every natural parent must be a published cause (owner + slug).'
    }
  }
  const parentKeys = new Set(fields.parents.map((p) => `${p.owner}:${p.slug}`))
  for (const modified of fields.modified) {
    if (!isAddress(modified.owner) || validateSlug(modified.slug)) {
      return 'Every modified cause must be published before the cluster can be sealed.'
    }
    const parentKey = `${modified.parentOwner}:${modified.parentSlug}`
    if (!parentKeys.has(parentKey)) {
      return 'A modified cause points at a parent that is not in this cluster.'
    }
  }
  if (!isAddress(fields.bridge.owner) || validateSlug(fields.bridge.slug)) {
    return 'Publish the bridge cause before sealing the cluster.'
  }
  const toBridge = fields.pairs.filter((pair) => pair.role === 'modified-to-bridge')
  if (toBridge.length === 0) {
    return 'Record at least one modified→bridge plank pair. Causes do not imply each other.'
  }
  return null
}

export function renderClusterContent(fields: BridgeClusterFields): string {
  const lines = [
    `# Bridge cluster`,
    '',
    `Mediator: ${fields.mediatorName.trim()}`,
  ]
  if (fields.mediatorNote.trim()) {
    lines.push('', fields.mediatorNote.trim())
  }
  lines.push('', '## Natural parents')
  for (const parent of fields.parents) {
    lines.push(`- ${parent.owner}/${parent.slug}`)
  }
  lines.push('', '## Modified causes')
  for (const modified of fields.modified) {
    lines.push(`- ${modified.owner}/${modified.slug} (from ${modified.parentOwner}/${modified.parentSlug})`)
  }
  lines.push('', '## Bridge cause', `- ${fields.bridge.owner}/${fields.bridge.slug}`)
  lines.push('', '## Intended plank pairs')
  for (const pair of fields.pairs) {
    lines.push(`- ${pair.fromCid} → ${pair.toCid} (${pair.role})`)
  }
  return lines.join('\n')
}

export function buildClusterDocument(fields: BridgeClusterFields): DisplayableDocument {
  const extras: BridgeClusterExtras = {
    kind: BRIDGE_CLUSTER_KIND,
    version: BRIDGE_CLUSTER_SCHEMA_VERSION,
    mediatorName: fields.mediatorName.trim().slice(0, MAX_NAME),
    mediatorNote: fields.mediatorNote.trim().slice(0, MAX_NOTE),
    mediatorAddress: fields.mediatorAddress.toLowerCase() as `0x${string}`,
    parents: fields.parents.map((p) => ({ owner: p.owner.toLowerCase() as `0x${string}`, slug: p.slug })),
    modified: fields.modified.map((m) => ({
      owner: m.owner.toLowerCase() as `0x${string}`,
      slug: m.slug,
      parentOwner: m.parentOwner.toLowerCase() as `0x${string}`,
      parentSlug: m.parentSlug,
    })),
    bridge: {
      owner: fields.bridge.owner.toLowerCase() as `0x${string}`,
      slug: fields.bridge.slug,
    },
    pairs: fields.pairs.map((pair) => ({ ...pair })),
  }
  return createDisplayableDocument({
    format: 'markdown-restricted',
    content: renderClusterContent(fields),
    extras: extras as unknown as Record<string, unknown>,
  })
}

export function previewClusterCid(fields: BridgeClusterFields): string {
  return publishedDataCidForDocument(buildClusterDocument(fields))
}

export function parseClusterDocument(doc: DisplayableDocument): BridgeClusterFields | null {
  const extras = doc.extras
  if (!extras || typeof extras !== 'object') return null
  if (extras.kind !== BRIDGE_CLUSTER_KIND) return null
  if (extras.version !== BRIDGE_CLUSTER_SCHEMA_VERSION) return null

  const mediatorName = typeof extras.mediatorName === 'string' ? extras.mediatorName : ''
  const mediatorNote = typeof extras.mediatorNote === 'string' ? extras.mediatorNote : ''
  const mediatorAddress = typeof extras.mediatorAddress === 'string' ? extras.mediatorAddress : ''
  if (!mediatorName.trim() || !isAddress(mediatorAddress)) return null

  const parents = Array.isArray(extras.parents)
    ? extras.parents.map(parseCauseRef).filter((v): v is CauseRef => Boolean(v))
    : []
  const modified = Array.isArray(extras.modified)
    ? extras.modified.map(parseModifiedRef).filter((v): v is ModifiedCauseRef => Boolean(v))
    : []
  const bridge = parseCauseRef(extras.bridge)
  if (!bridge) return null
  const pairs = Array.isArray(extras.pairs)
    ? extras.pairs.map(parsePair).filter((v): v is IntendedPair => Boolean(v))
    : []

  return {
    mediatorName,
    mediatorNote,
    mediatorAddress: mediatorAddress.toLowerCase() as `0x${string}`,
    parents,
    modified,
    bridge,
    pairs,
  }
}

export function stableClusterPath(id: StableCauseId, versionCid?: string): string {
  const base = `/bridge/${id.owner}/${encodeURIComponent(id.slug)}`
  return versionCid ? `${base}@${versionCid}` : base
}

export function parseClusterRouteParams(
  owner: string | undefined,
  slugPart: string | undefined,
): { owner: `0x${string}`; slug: string; versionCid?: string } | null {
  return parseCauseRouteParams(owner, slugPart)
}

function contractsFromMachinery(machinery: SDKMachinery) {
  const addresses = machinery.contractAddresses
  const mutableRefAddress = (addresses?.mutableRefUpdater
    || getRuntimeConfigValue('VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  const publishedDataAddress = (addresses?.publishedData
    || getRuntimeConfigValue('VITE_PUBLISHED_DATA_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  return { mutableRefAddress, publishedDataAddress }
}

export async function publishCluster(args: {
  machinery: SDKMachinery
  writeClients: WriteClients | null | undefined
  slug: string
  fields: BridgeClusterFields
}): Promise<PublishClusterResult> {
  const { machinery, writeClients, slug, fields } = args
  const slugError = validateSlug(slug)
  if (slugError) throw new Error(slugError)
  if (!writeClients) {
    throw new Error('Wallet is not ready. Connect your wallet and try again.')
  }
  const problem = validateClusterFields(fields)
  if (problem) throw new Error(problem)

  const { mutableRefAddress, publishedDataAddress } = contractsFromMachinery(machinery)
  if (!mutableRefAddress || !publishedDataAddress) {
    throw new Error('Contract addresses are missing. Redeploy CauseStarter to refresh config.json.')
  }

  const doc = buildClusterDocument(fields)
  const validation = validateDisplayableDocument(doc)
  if (!validation.valid) {
    throw new Error(`Invalid cluster document: ${validation.errors.join(', ')}`)
  }
  const content = new TextEncoder().encode(toCanonicalJson(doc))
  const clusterCid = publishedDataCidForDocument(doc)

  const calls: ContractCall[] = [
    {
      to: publishedDataAddress,
      abi: PublishedDataAbi as never,
      functionName: 'publishData',
      args: [toHex(content)],
    },
    {
      to: mutableRefAddress,
      abi: MutableRefUpdaterAbi as never,
      functionName: 'updateRef',
      args: [slug, clusterCid],
    },
  ]

  const { hashes, batched } = await sendCallsPreferAtomic(writeClients, calls)
  if (batched) {
    const hash = hashes[0]!
    return { clusterCid, publishTxHash: hash, refTxHash: hash, batched: true }
  }
  return {
    clusterCid,
    publishTxHash: hashes[0]!,
    refTxHash: hashes[1]!,
    batched: false,
  }
}

export async function resolveClusterCid(
  machinery: SDKMachinery,
  owner: string,
  slug: string,
): Promise<string | null> {
  const ref = await getUserRef(machinery, owner, slug)
  const value = ref?.value?.trim()
  return value || null
}

export async function loadClusterDocument(
  machinery: SDKMachinery,
  clusterCid: string,
): Promise<{ document: DisplayableDocument; fields: BridgeClusterFields } | null> {
  const store = createDefaultDocumentStore(machinery)
  const read = await store.read(clusterCid as never)
  if (read.status !== 'active') return null
  const fields = parseClusterDocument(read.document)
  if (!fields) return null
  return { document: read.document, fields }
}

/** Nudge path is always parent → modified, never parent → bridge. */
export function nudgeTargets(fields: BridgeClusterFields): Array<{ from: CauseRef; to: CauseRef }> {
  return fields.modified.map((modified) => ({
    from: { owner: modified.parentOwner, slug: modified.parentSlug },
    to: { owner: modified.owner, slug: modified.slug },
  }))
}
