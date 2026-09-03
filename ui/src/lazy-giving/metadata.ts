import { createDefaultDocumentReader, type DisplayableDocument, type DocumentReadResult } from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { PolicyContentItem, PolicyEvaluationResult, PolicyEvaluator } from '@commonality/sdk/policy-lists'
import { fetchFromIPFS, type IpfsCidV1 } from '@commonality/sdk/utils'
import { displayPolicyFromDenylist, isCidDeniedByDisplayDenylist, loadDisplayDenylist, type DisplayDenylist } from '../shared'

export type ProjectMetadata = {
  name?: string
  description?: string
  updatesUrl?: string
  tokens?: Record<string, string>
  displayName?: string
  handle?: string
  creatorDisplayName?: string
  channelDisplayName?: string
  channelHandle?: string
  relevantAreas?: string[][]
}
export type TokenMetadata = { name?: string; image?: string; description?: string }

type MetadataKind = 'project' | 'token'

export interface MetadataPolicyContext {
  evaluator: PolicyEvaluator
  item: PolicyContentItem
  onDecision?: (decision: PolicyEvaluationResult) => void
}

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function stringRecordField(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function relevantAreasField(value: unknown): string[][] | undefined {
  if (!Array.isArray(value)) return undefined
  const paths = value.map((path) => Array.isArray(path)
    ? path.filter((part): part is string => typeof part === 'string').map((part) => part.trim()).filter(Boolean)
    : []).filter((path) => path.length > 0)
  return paths.length > 0 ? paths : undefined
}

export function projectMetadataFromDocument(document: DisplayableDocument): ProjectMetadata {
  const extras = document.extras ?? {}
  return {
    name: stringField(extras.name),
    description: stringField(extras.description) ?? document.content,
    updatesUrl: stringField(extras.updatesUrl),
    tokens: stringRecordField(extras.tokens),
    displayName: stringField(extras.displayName),
    handle: stringField(extras.handle),
    creatorDisplayName: stringField(extras.creatorDisplayName),
    channelDisplayName: stringField(extras.channelDisplayName),
    channelHandle: stringField(extras.channelHandle),
    relevantAreas: relevantAreasField(extras.relevantAreas),
  }
}

export function tokenMetadataFromDocument(document: DisplayableDocument): TokenMetadata {
  const extras = document.extras ?? {}
  return {
    name: stringField(extras.name),
    image: stringField(extras.image),
    description: stringField(extras.description) ?? document.content,
  }
}

async function getDisplayDenylist(displayDenylist?: DisplayDenylist): Promise<DisplayDenylist> {
  return displayDenylist ?? loadDisplayDenylist()
}

function metadataFromDisplayableDocument(kind: MetadataKind, document: DisplayableDocument): ProjectMetadata | TokenMetadata {
  return kind === 'project' ? projectMetadataFromDocument(document) : tokenMetadataFromDocument(document)
}

function suppressesLegacyFallback(result: DocumentReadResult): boolean {
  return result.status === 'retracted' || result.status === 'invalid'
}

async function readLazyGivingMetadata(kind: 'project', machinery: SDKMachinery, cid: IpfsCidV1, displayDenylist?: DisplayDenylist, policy?: MetadataPolicyContext): Promise<ProjectMetadata | null>
async function readLazyGivingMetadata(kind: 'token', machinery: SDKMachinery, cid: IpfsCidV1, displayDenylist?: DisplayDenylist, policy?: MetadataPolicyContext): Promise<TokenMetadata | null>
async function readLazyGivingMetadata(
  kind: MetadataKind,
  machinery: SDKMachinery,
  cid: IpfsCidV1,
  displayDenylist?: DisplayDenylist,
  policy?: MetadataPolicyContext,
): Promise<ProjectMetadata | TokenMetadata | null> {
  if (policy) {
    const decision = policy.evaluator.evaluate('suppress', {
      item: { ...policy.item, cid },
    })
    policy.onDecision?.(decision)
    if (decision.decision === 'block') return null
  }

  const resolvedDisplayDenylist = await getDisplayDenylist(displayDenylist)
  if (isCidDeniedByDisplayDenylist(cid, resolvedDisplayDenylist)) return null

  const result = await createDefaultDocumentReader(machinery).read(cid, displayPolicyFromDenylist(resolvedDisplayDenylist))
  if (result.status === 'active') return metadataFromDisplayableDocument(kind, result.document)
  if (suppressesLegacyFallback(result)) return null

  // Pre-migration LazyGiving metadata was plain JSON on IPFS, not a DisplayableDocument.
  // Keep this narrow legacy fallback only after the CID-first reader has had the first
  // chance to honor PublishedData retractions/invalid bytes.
  const legacy = await fetchFromIPFS(machinery.ipfsConfig, cid)
  return legacy ? legacy as ProjectMetadata | TokenMetadata : null
}

export async function readLazyGivingProjectMetadata(
  machinery: SDKMachinery,
  cid: IpfsCidV1,
  displayDenylist?: DisplayDenylist,
  policy?: MetadataPolicyContext,
): Promise<ProjectMetadata | null> {
  return readLazyGivingMetadata('project', machinery, cid, displayDenylist, policy)
}

export async function readLazyGivingTokenMetadata(
  machinery: SDKMachinery,
  cid: IpfsCidV1,
  displayDenylist?: DisplayDenylist,
  policy?: MetadataPolicyContext,
): Promise<TokenMetadata | null> {
  return readLazyGivingMetadata('token', machinery, cid, displayDenylist, policy)
}
