/**
 * Cause roster as a published, versioned artifact.
 *
 * A roster is all organizer-authored display text for a cause page: title, summary,
 * ordered plank CIDs, and mediator blurb. Its PublishedData CID is the version ID;
 * a MutableRef `(owner, slug) → CID` is the stable ID used in the URL.
 *
 * See docs/founder/shaping-your-cause-statements.md § The roster is a publication.
 */

import {
  MutableRefUpdaterAbi,
  PublishedDataAbi,
} from '@commonality/sdk/abis'
import {
  createDefaultDocumentReader,
  createDefaultDocumentStore,
  createDisplayableDocument,
  publishedDataCidForDocument,
  toCanonicalJson,
  validateDisplayableDocument,
  type DisplayableDocument,
} from '@commonality/sdk/displayable-documents'
import {
  getSubjectStatements,
  type AlignmentAttestation,
} from '@commonality/sdk/fundingportals'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import {
  getUserRef,
  getUserRefHistory,
  RESERVED_REF_NAMES,
  type RefUpdate,
} from '@commonality/sdk/mutable-refs'
import {
  cidToBytes32,
  type IpfsCidV1,
  type WriteClients,
} from '@commonality/sdk/utils'
import {
  encodeFunctionData,
  numberToHex,
  toHex,
  type Abi,
  type Address,
  type Hash,
} from 'viem'
import { getRuntimeConfigValue } from './runtimeConfig'
import type { CauseDraft, CauseMediator, CausePlank } from './causeStore'
import { publishedPlanks } from './causeStore'

/** Structured payload stored in DisplayableDocument.extras. */
export const ROSTER_KIND = 'causestarter.roster' as const
export const ROSTER_SCHEMA_VERSION = 1 as const

/**
 * Well-known topic for roster coherence attestations (construction, not merit).
 * Positive-only: silence means no badge — never a published negative judgment.
 */
export const ROSTER_COHERENCE_TOPIC_DOCUMENT: DisplayableDocument = createDisplayableDocument({
  format: 'text/plain',
  content: 'This is the well-known topic for cause-roster coherence attestations in Commonality.',
  extras: {
    statementType: 'topic',
    kind: 'causestarter.roster-coherence',
  },
})

/**
 * Well-known claim: subject roster is coherently constructed.
 * Bound on-chain via AlignmentAttestations (subject = roster CID digest).
 */
export const ROSTER_COHERENCE_CLAIM_DOCUMENT: DisplayableDocument = createDisplayableDocument({
  format: 'text/plain',
  content:
    'This roster is coherently constructed: its published issues match its title and summary, and it hides no riders. This is a claim about construction only, not about merit.',
  extras: {
    statementType: 'claim',
    kind: 'causestarter.roster-coherence',
  },
})

export const ROSTER_COHERENCE_TOPIC: IpfsCidV1 = publishedDataCidForDocument(
  ROSTER_COHERENCE_TOPIC_DOCUMENT,
) as IpfsCidV1

export const ROSTER_COHERENCE_CLAIM: IpfsCidV1 = publishedDataCidForDocument(
  ROSTER_COHERENCE_CLAIM_DOCUMENT,
) as IpfsCidV1

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
  /** True when publish + updateRef shared one wallet batch. */
  batched: boolean
}

export interface RosterCoherenceBadge {
  rosterCid: string
  /** On-chain attester addresses that asserted the well-known coherence claim. */
  attesters: `0x${string}`[]
  /** Earliest attestation timestamp (ISO), when available. */
  attestedAt?: string
  attestations: AlignmentAttestation[]
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
 * Build the organizer-authored fields that go into a roster document.
 * Title falls back to the first published plank when the organizer left it blank.
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
  const alignmentAddress = (addresses?.alignmentAttestations
    || getRuntimeConfigValue('VITE_ALIGNMENT_ATTESTATIONS_CONTRACT_ADDRESS')) as `0x${string}` | undefined
  return { mutableRefAddress, publishedDataAddress, alignmentAddress }
}

/** Subject id for AlignmentAttestations: roster document CID digest. */
export function rosterSubjectId(rosterCid: string): `0x${string}` {
  return cidToBytes32(rosterCid)
}

export type ContractCall = {
  to: Address
  abi: Abi
  functionName: string
  args: readonly unknown[]
}

/**
 * True when a wallet rejected a request because it does not implement the method
 * (JSON-RPC -32601, or the equivalent message from injectors like local Hardhat).
 */
function isUnsupportedMethodError(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code
  if (code === -32601 || code === 4200) return true
  const message = error instanceof Error ? error.message : String(error)
  return /method not found|not supported|does not support|unsupported method|does not exist/i
    .test(message)
}

/**
 * EIP-5792 atomic batch when the wallet supports it; otherwise sequential writes.
 * Local Hardhat EOAs often lack wallet_sendCalls — fall back without failing the publish.
 */
export async function sendCallsPreferAtomic(
  clients: WriteClients,
  calls: readonly ContractCall[],
): Promise<{ hashes: Hash[]; batched: boolean }> {
  if (calls.length === 0) return { hashes: [], batched: false }

  const chainId = clients.walletClient.chain?.id
  if (chainId && calls.length > 1) {
    let batchId: string | null = null
    try {
      const id = await clients.walletClient.request({
        method: 'wallet_sendCalls',
        params: [{
          version: '2.0.0',
          chainId: numberToHex(chainId),
          from: clients.account,
          atomicRequired: true,
          calls: calls.map(({ to, abi, functionName, args }) => ({
            to,
            data: encodeFunctionData({ abi, functionName, args }),
          })),
        }],
      })
      batchId = typeof id === 'string' ? id : (id as { id: string }).id
    } catch (error) {
      // Only a wallet that cannot batch may fall through to sequential. Any other
      // submission failure is surfaced, since retrying could double-send.
      if (!isUnsupportedMethodError(error)) throw error
    }

    // Past this point the batch is in flight: never retry sequentially, or the
    // publish + updateRef would run a second time on a slow-but-successful batch.
    if (batchId !== null) {
      const deadline = Date.now() + 120_000
      for (;;) {
        const status = await clients.walletClient.request({
          method: 'wallet_getCallsStatus',
          params: [batchId],
        }) as { status: number; receipts?: { transactionHash?: Hash }[] }
        if (status.status === 200) {
          const hash = status.receipts?.[0]?.transactionHash
          if (!hash) throw new Error('Atomic transaction completed without a transaction hash.')
          return { hashes: [hash], batched: true }
        }
        if (status.status >= 300) throw new Error('Atomic transaction failed.')
        if (Date.now() >= deadline) {
          throw new Error('Timed out waiting for atomic transaction confirmation.')
        }
        await new Promise((resolve) => setTimeout(resolve, 1_000))
      }
    }
  }

  const hashes: Hash[] = []
  for (const call of calls) {
    const hash = await clients.walletClient.writeContract({
      address: call.to,
      abi: call.abi,
      functionName: call.functionName,
      args: call.args as never,
      chain: clients.walletClient.chain,
      account: clients.walletClient.account!,
    })
    await clients.publicClient.waitForTransactionReceipt({ hash })
    hashes.push(hash)
  }
  return { hashes, batched: false }
}

/**
 * Publish roster document via PublishedData and point the stable ref at its CID.
 *
 * Coherence badges are written by the CauseStarter operator (cause-assist), never
 * from the organizer wallet — the trusted RefUpdated worker handles it asynchronously.
 *
 * Prefers one atomic wallet batch (publish + updateRef); falls back to sequential
 * txs when the wallet cannot batch.
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
  const validation = validateDisplayableDocument(doc)
  if (!validation.valid) {
    throw new Error(`Invalid roster document: ${validation.errors.join(', ')}`)
  }
  const content = new TextEncoder().encode(toCanonicalJson(doc))
  const rosterCid = publishedDataCidForDocument(doc)

  const calls: ContractCall[] = [
    {
      to: publishedDataAddress,
      abi: PublishedDataAbi as Abi,
      functionName: 'publishData',
      args: [toHex(content)],
    },
    {
      to: mutableRefAddress,
      abi: MutableRefUpdaterAbi as Abi,
      functionName: 'updateRef',
      args: [slug, rosterCid],
    },
  ]

  const { hashes, batched } = await sendCallsPreferAtomic(writeClients, calls)

  if (batched) {
    const hash = hashes[0]!
    return {
      rosterCid,
      publishTxHash: hash,
      refTxHash: hash,
      batched: true,
    }
  }

  return {
    rosterCid,
    publishTxHash: hashes[0]!,
    refTxHash: hashes[1]!,
    batched: false,
  }
}

/**
 * Load on-chain positive coherence attestations for a roster version CID.
 * Viewers recompute the badge from AlignmentAttestations + well-known claim/topic.
 *
 * `operator` is the CauseStarter operator address (from cause-assist /health).
 * Anyone can write the well-known claim about any roster — including the organizer —
 * so only attestations signed by that operator count. Without a known operator
 * there is nothing to trust, and no badge is shown.
 */
export async function loadRosterCoherenceBadge(
  machinery: SDKMachinery,
  rosterCid: string,
  operator: `0x${string}` | null | undefined,
): Promise<RosterCoherenceBadge | null> {
  if (!rosterCid || !operator) return null
  const operatorAddress = operator.toLowerCase()
  let attestations: AlignmentAttestation[]
  try {
    attestations = await getSubjectStatements(
      machinery,
      rosterSubjectId(rosterCid),
      undefined,
      ROSTER_COHERENCE_TOPIC,
    )
  } catch {
    return null
  }

  // AlignmentAttestations stores only the multihash digest; decoded CIDs may use
  // dag-pb (bafybei…) while well-known PublishedData CIDs use raw (bafkrei…).
  const claimDigest = cidToBytes32(ROSTER_COHERENCE_CLAIM).toLowerCase()
  const matching = attestations.filter((a) => {
    if (a.attester.toLowerCase() !== operatorAddress) return false
    try {
      return cidToBytes32(a.statementCid).toLowerCase() === claimDigest
    } catch {
      return a.statementCid === ROSTER_COHERENCE_CLAIM
    }
  })

  if (matching.length === 0) return null
  const active = matching

  const attesters = [...new Set(active.map((a) => a.attester.toLowerCase() as `0x${string}`))]
  const times = active
    .map((a) => a.createdAt)
    .filter((t): t is string => Boolean(t))
    .sort()
  return {
    rosterCid,
    attesters,
    attestedAt: times[0],
    attestations: active,
  }
}

/**
 * Pure helper: which planks first appeared after the earliest roster version.
 * History is newest-first (getUserRefHistory).
 */
export function plankAddedLaterLabels(
  history: RefUpdate[],
  firstSeen: Map<string, RefUpdate>,
  now = Date.now(),
): Map<string, string> {
  const labels = new Map<string, string>()
  if (history.length < 2) return labels
  const oldest = history[history.length - 1]
  if (!oldest) return labels

  for (const [cid, update] of firstSeen) {
    if (update.id === oldest.id) continue
    if (update.value === oldest.value) continue
    // Same block as first version is not "later"
    if (update.blockNumber === oldest.blockNumber && update.logIndex === oldest.logIndex) continue
    const age = formatRosterAge(Number(update.timestamp) * 1000, now)
    labels.set(cid, `Added later · ${age}`)
  }
  return labels
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

/** Placeholder rows so the cause page can paint before statement bodies resolve. */
export function placeholderPlanksFromCids(plankCids: readonly string[]): CausePlank[] {
  return plankCids.map((cid) => ({
    id: `plank:${cid}`,
    text: cid,
    origin: 'user' as const,
    cid,
  }))
}

/** Body text from a statement document, or empty when the payload is missing. */
export function textFromStatementDocument(document: DisplayableDocument | null | undefined): string {
  const content = document?.content
  return typeof content === 'string' ? content.trim() : ''
}

/**
 * Cheap plank-body read: PublishedData (then a short IPFS fallback).
 * Does not walk DirectSupport events the way getStatementWithContent does.
 */
export async function readPlankText(machinery: SDKMachinery, cid: string): Promise<string> {
  try {
    const reader = createDefaultDocumentReader(machinery)
    const read = await reader.read(cid as IpfsCidV1)
    if (read.status !== 'active') return cid
    return textFromStatementDocument(read.document) || cid
  } catch {
    return cid
  }
}

/** Resolve plank bodies in parallel. Missing content stays the CID. */
export async function loadPlankTexts(
  machinery: SDKMachinery,
  plankCids: readonly string[],
): Promise<Map<string, string>> {
  const entries = await Promise.all(
    plankCids.map(async (cid) => [cid, await readPlankText(machinery, cid)] as const),
  )
  return new Map(entries)
}

/** Fill in resolved bodies without clobbering a local edit that is not just the CID. */
export function applyPlankTexts(planks: CausePlank[], texts: Map<string, string>): CausePlank[] {
  return planks.map((plank) => {
    if (!plank.cid) return plank
    const next = texts.get(plank.cid)
    if (!next || next === plank.text) return plank
    if (plank.text && plank.text !== plank.cid) return plank
    return { ...plank, text: next }
  })
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
