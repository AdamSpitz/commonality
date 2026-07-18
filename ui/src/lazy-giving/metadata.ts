import { createDefaultDocumentReader, type DisplayableDocument } from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import { fetchFromIPFS, type IpfsCidV1 } from '@commonality/sdk/utils'

export type ProjectMetadata = { name?: string; description?: string; updatesUrl?: string; tokens?: Record<string, string> }
export type TokenMetadata = { name?: string; image?: string; description?: string }

function stringField(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function stringRecordField(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export function projectMetadataFromDocument(document: DisplayableDocument): ProjectMetadata {
  const extras = document.extras ?? {}
  return {
    name: stringField(extras.name),
    description: stringField(extras.description) ?? document.content,
    updatesUrl: stringField(extras.updatesUrl),
    tokens: stringRecordField(extras.tokens),
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

export async function readLazyGivingProjectMetadata(machinery: SDKMachinery, cid: IpfsCidV1): Promise<ProjectMetadata | null> {
  const result = await createDefaultDocumentReader(machinery).read(cid)
  if (result.status === 'active') return projectMetadataFromDocument(result.document)
  if (result.status === 'retracted' || result.status === 'invalid') return null

  const legacy = await fetchFromIPFS(machinery.ipfsConfig, cid)
  return legacy ? legacy as ProjectMetadata : null
}

export async function readLazyGivingTokenMetadata(machinery: SDKMachinery, cid: IpfsCidV1): Promise<TokenMetadata | null> {
  const result = await createDefaultDocumentReader(machinery).read(cid)
  if (result.status === 'active') return tokenMetadataFromDocument(result.document)
  if (result.status === 'retracted' || result.status === 'invalid') return null

  const legacy = await fetchFromIPFS(machinery.ipfsConfig, cid)
  return legacy ? legacy as TokenMetadata : null
}
