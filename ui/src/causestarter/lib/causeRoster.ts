/**
 * Cause roster as a published, versioned artifact.
 *
 * A roster is all organizer-authored display text for a cause page: title, summary,
 * ordered plank CIDs, and the optional mediator. Its PublishedData CID is the version ID;
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
import { getStatementWithContent } from '@commonality/sdk/conceptspace'
import {
  getSubjectStatements,
  type AlignmentAttestation,
} from '@commonality/sdk/fundingportals'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { mapWithConcurrency, PLANK_QUERY_CONCURRENCY } from './concurrency'
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
import type { CauseAnchor, CauseDraft, CauseMediator, CausePlank, RosterBridgeLink } from './causeStore'
import {
  parseBoardInclusionRules,
  parsePlacePath,
  type BoardInclusionRules,
} from '../../fundingportals/components/geographicInclusion'
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
  /** Founder-authored mediator copy, rendered into the document body. */
  mediatorBlurb: string
  /**
   * Machine-readable mediator identity. Published so that *followers* — who have no
   * local copy of the cause — can fetch its featured bridges and build an opt-in link.
   * Omitted entirely when the cause has no mediator, which keeps roster CIDs for
   * mediator-less causes byte-identical to those published before this field existed.
   */
  mediator?: CauseMediator
  /**
   * When this roster is a modified or bridge cause in a cluster, point back at
   * that cluster so the cause page can label mediator authorship.
   */
  bridgeCluster?: RosterBridgeLink
  /** Promoted combinator anchors, omitted entirely when there are none. */
  anchors?: CauseAnchor[]
  /**
   * Optional public contact URI. Omitted when empty so contact-less roster CIDs
   * stay byte-identical to pre-field publications (ADR 0011).
   */
  contactUrl?: string
  /** Factual view rules; initially only an optional geographic scope. */
  inclusionRules?: BoardInclusionRules
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
const MAX_CONTACT_URL_LENGTH = 300

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

/**
 * One public contact URI the organizer already uses. Not a Commonality inbox.
 * `mailto:` is allowed; javascript and other schemes are not.
 */
export function parseContactUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim().slice(0, MAX_CONTACT_URL_LENGTH)
  if (!trimmed) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'mailto:') {
      return parsed.href.startsWith('mailto:') ? parsed.href : undefined
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Validate a mediator record read back from a published roster.
 *
 * Roster documents are fetched from IPFS, and the mediator's `serviceUrl` is fetched
 * and its `address` put into an opt-in link, so a malformed or hostile record must not
 * reach the UI. All four fields are required — a half-filled mediator can't be
 * contacted or trusted — and anything unexpected degrades to "no mediator".
 */
export function parseCauseMediator(value: unknown): CauseMediator | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const name = typeof record.name === 'string' ? record.name.trim() : ''
  const description = typeof record.description === 'string' ? record.description.trim() : ''
  const address = typeof record.address === 'string' ? record.address.trim() : ''
  const serviceUrl = typeof record.serviceUrl === 'string' ? record.serviceUrl.trim() : ''
  if (!name || !description || !address || !serviceUrl) return undefined
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return undefined
  try {
    if (!['http:', 'https:'].includes(new URL(serviceUrl).protocol)) return undefined
  } catch {
    return undefined
  }
  return {
    name: name.slice(0, MAX_MEDIATOR_BLURB_LENGTH),
    description: description.slice(0, MAX_MEDIATOR_BLURB_LENGTH),
    address,
    serviceUrl: serviceUrl.replace(/\/+$/, ''),
  }
}

export function parseRosterBridgeLink(value: unknown): RosterBridgeLink | undefined {
  if (!value || typeof value !== 'object') return undefined
  const record = value as Record<string, unknown>
  const clusterOwner = typeof record.clusterOwner === 'string' ? record.clusterOwner.trim() : ''
  const clusterSlug = typeof record.clusterSlug === 'string' ? record.clusterSlug.trim() : ''
  const role = record.role
  if (!/^0x[0-9a-fA-F]{40}$/.test(clusterOwner)) return undefined
  if (validateSlug(clusterSlug)) return undefined
  if (role !== 'modified' && role !== 'bridge') return undefined
  const parentOwner = typeof record.parentOwner === 'string' ? record.parentOwner.trim() : ''
  const parentSlug = typeof record.parentSlug === 'string' ? record.parentSlug.trim() : ''
  const parent = /^0x[0-9a-fA-F]{40}$/.test(parentOwner) && !validateSlug(parentSlug)
    ? { parentOwner: parentOwner.toLowerCase() as `0x${string}`, parentSlug }
    : {}
  return {
    clusterOwner: clusterOwner.toLowerCase() as `0x${string}`,
    clusterSlug,
    role,
    ...parent,
  }
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
  const anchors = parseAnchors(cause.anchors)
  const contactUrl = parseContactUrl(cause.contactUrl)
  const projectAreaWithin = parsePlacePath(cause.projectAreaWithin)
  return {
    title,
    summary: (cause.summary?.trim() ?? '').slice(0, MAX_SUMMARY_LENGTH),
    plankCids: planks.map((plank) => plank.cid!).filter(Boolean),
    mediatorBlurb: mediatorBlurbFrom(cause.mediator).slice(0, MAX_MEDIATOR_BLURB_LENGTH),
    mediator: parseCauseMediator(cause.mediator),
    ...(cause.bridgeCluster ? { bridgeCluster: cause.bridgeCluster } : {}),
    ...(anchors ? { anchors } : {}),
    ...(contactUrl ? { contactUrl } : {}),
    ...(projectAreaWithin ? { inclusionRules: { geographic: { within: projectAreaWithin } } } : {}),
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
  const contactUrl = parseContactUrl(fields.contactUrl)
  if (contactUrl) {
    lines.push('', '## Contact', contactUrl)
  }
  const anchors = parseAnchors(fields.anchors)
  if (anchors) {
    lines.push('', '## Graph handles')
    for (const anchor of anchors) {
      lines.push(`- ${anchor.combinator} of ${anchor.operandCids.length} statements: ${anchor.cid}`)
    }
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
  // Added only when present, so mediator-less rosters keep their pre-existing CIDs.
  const mediator = parseCauseMediator(fields.mediator)
  if (mediator) extras.mediator = mediator
  const bridgeCluster = parseRosterBridgeLink(fields.bridgeCluster)
  if (bridgeCluster) extras.bridgeCluster = bridgeCluster
  const anchors = parseAnchors(fields.anchors)
  if (anchors) extras.anchors = anchors
  const contactUrl = parseContactUrl(fields.contactUrl)
  if (contactUrl) extras.contactUrl = contactUrl
  const inclusionRules = parseBoardInclusionRules(fields.inclusionRules)
  if (inclusionRules) extras.inclusionRules = inclusionRules
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
  // Absent on rosters published before the mediator identity was carried; not an error.
  const mediator = parseCauseMediator(extras.mediator)
  const bridgeCluster = parseRosterBridgeLink(extras.bridgeCluster)
  const anchors = parseAnchors(extras.anchors)
  const contactUrl = parseContactUrl(extras.contactUrl)
  const inclusionRules = parseBoardInclusionRules(extras.inclusionRules)
  return {
    title,
    summary,
    plankCids,
    mediatorBlurb,
    ...(mediator ? { mediator } : {}),
    ...(bridgeCluster ? { bridgeCluster } : {}),
    ...(anchors ? { anchors } : {}),
    ...(contactUrl ? { contactUrl } : {}),
    ...(inclusionRules ? { inclusionRules } : {}),
  }
}

/**
 * Anchors carry their operands: a bare CID cannot be shown honestly, because
 * nothing says which selection minted it. Entries that lack operands (or that
 * came from the pre-operand shape) are dropped rather than displayed.
 */
export function parseAnchors(value: unknown): CauseAnchor[] | undefined {
  if (!Array.isArray(value)) return undefined
  const anchors: CauseAnchor[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const combinator = record.combinator
    if (combinator !== 'all' && combinator !== 'any') continue
    const cid = typeof record.cid === 'string' ? record.cid.trim() : ''
    if (!cid) continue
    if (!Array.isArray(record.operandCids)) continue
    const operandCids = record.operandCids
      .filter((operand): operand is string => typeof operand === 'string' && Boolean(operand.trim()))
      .map((operand) => operand.trim())
    if (operandCids.length < 2) continue
    anchors.push({ combinator, cid, operandCids })
  }
  return anchors.length > 0 ? anchors : undefined
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

/**
 * Pull a cause reference out of whatever an organizer pasted.
 *
 * There is no directory to search (ADR 0008), so a link someone circulated is
 * how one cause reaches another. Accepts a full URL, a hash-routed URL, a bare
 * path, or just `0xowner/slug`, and tolerates the trailing segments the editor
 * and boards add (`/edit`, `/funding`, …) plus a pinned `@versionCid`.
 *
 * Returns null rather than guessing: a half-parsed owner would publish a
 * modified cause pointing at nobody.
 */
export function parseCauseLink(raw: string): CauseRouteRef | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  let path = trimmed
  try {
    // Absolute URLs may carry the route in the hash (IPFS builds) or the path.
    const url = new URL(trimmed)
    path = url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname
  } catch {
    // Not an absolute URL: treat it as a path or a bare owner/slug pair.
    const hash = trimmed.indexOf('#/')
    if (hash >= 0) path = trimmed.slice(hash + 1)
  }

  const segments = path.split('/').filter(Boolean)
  const start = segments.indexOf('cause')
  const parts = start >= 0 ? segments.slice(start + 1) : segments
  if (parts.length < 2) return null

  return parseCauseRouteParams(parts[0], parts[1])
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
    throw new Error('Publish at least one statement before publishing the cause roster.')
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
  if (!document) return ''
  const raw = document as { content?: unknown; title?: unknown }
  const content = raw.content
  if (typeof content === 'string' && content.trim()) return content.trim()
  if (content && typeof content === 'object') {
    const nested = (content as { content?: unknown }).content
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
  }
  const title = raw.title
  return typeof title === 'string' ? title.trim() : ''
}

/**
 * Resolve a plank's display text from PublishedData / IPFS, then the statement
 * query used by the statement page. Missing content stays the CID.
 */
export async function readPlankText(machinery: SDKMachinery, cid: string): Promise<string> {
  try {
    const reader = createDefaultDocumentReader(machinery)
    const read = await reader.read(cid as IpfsCidV1)
    if (read.status === 'active') {
      const text = textFromStatementDocument(read.document)
      if (text) return text
    }
  } catch {
    // Fall through to the statement-page loader.
  }
  try {
    const result = await getStatementWithContent(machinery, cid as IpfsCidV1)
    return textFromStatementDocument(result?.content) || cid
  } catch {
    return cid
  }
}

/** Resolve plank bodies in parallel. Missing content stays the CID. */
export async function loadPlankTexts(
  machinery: SDKMachinery,
  plankCids: readonly string[],
): Promise<Map<string, string>> {
  const entries = await mapWithConcurrency(
    plankCids,
    PLANK_QUERY_CONCURRENCY,
    async (cid) => [cid, await readPlankText(machinery, cid)] as const,
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
