import { createDefaultDocumentReader, type DisplayableDocument } from '@commonality/sdk/displayable-documents'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { IpfsCidV1 } from '@commonality/sdk/utils'
import type { ProjectMetadata } from './AlignedProjectCard'

function projectMetadataFromDocument(document: DisplayableDocument): ProjectMetadata | null {
  const extras = document.extras
  if (!extras || typeof extras !== 'object') return null

  const name = typeof extras.name === 'string' ? extras.name : undefined
  const description = typeof extras.description === 'string' ? extras.description : document.content || undefined

  return name || description ? { name, description } : null
}

export async function readProjectMetadata(machinery: SDKMachinery, cid: IpfsCidV1): Promise<ProjectMetadata | null> {
  const result = await createDefaultDocumentReader(machinery).read(cid)
  if (result.status !== 'active') return null
  return projectMetadataFromDocument(result.document)
}
