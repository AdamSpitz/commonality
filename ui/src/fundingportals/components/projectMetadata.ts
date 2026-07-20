import { createDefaultDocumentReader, type DisplayableDocument, type DocumentReadResult } from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { fetchFromIPFS, type IpfsCidV1 } from '@commonality/sdk/utils'
import { displayPolicyFromDenylist, isCidDeniedByDisplayDenylist, loadDisplayDenylist } from '../../shared'
import type { ProjectMetadata } from './AlignedProjectCard'

function metadataFromFields(raw: { name?: unknown; title?: unknown; description?: unknown }, fallbackDescription?: string): ProjectMetadata | null {
  const name = typeof raw.name === 'string'
    ? raw.name
    : typeof raw.title === 'string'
      ? raw.title
      : undefined
  const description = typeof raw.description === 'string' ? raw.description : fallbackDescription
  return name || description ? { name, description } : null
}

function projectMetadataFromDocument(document: DisplayableDocument): ProjectMetadata | null {
  const extras = document.extras
  if (!extras || typeof extras !== 'object') return null
  return metadataFromFields(extras, document.content || undefined)
}

function projectMetadataFromLegacyJson(raw: unknown): ProjectMetadata | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return metadataFromFields(raw as Record<string, unknown>)
}

function suppressesLegacyFallback(result: DocumentReadResult): boolean {
  return result.status === 'retracted' || result.status === 'invalid'
}

export async function readProjectMetadata(machinery: SDKMachinery, cid: IpfsCidV1): Promise<ProjectMetadata | null> {
  const displayDenylist = await loadDisplayDenylist()
  if (isCidDeniedByDisplayDenylist(cid, displayDenylist)) return null

  const result = await createDefaultDocumentReader(machinery).read(cid, displayPolicyFromDenylist(displayDenylist))
  if (result.status === 'active') return projectMetadataFromDocument(result.document)
  if (suppressesLegacyFallback(result)) return null

  // Pre-migration funding-portal metadata was sometimes plain JSON on IPFS,
  // not a DisplayableDocument. Only fall back after the CID-first reader has
  // had the first chance to honor PublishedData retractions/invalid bytes.
  const legacy = await fetchFromIPFS(machinery.ipfsConfig, cid).catch(() => null)
  return projectMetadataFromLegacyJson(legacy)
}
