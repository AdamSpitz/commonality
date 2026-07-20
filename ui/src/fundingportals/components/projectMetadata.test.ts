import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DisplayableDocument, DocumentReadResult } from '@commonality/sdk/displayable-documents'
import { createDefaultDocumentReader } from '@commonality/sdk/displayable-documents'
import { fetchFromIPFS, type IpfsCidV1 } from '@commonality/sdk/utils'
import { readProjectMetadata } from './projectMetadata'

vi.mock('@commonality/sdk/displayable-documents', async () => {
  const actual = await vi.importActual('@commonality/sdk/displayable-documents')
  return {
    ...actual,
    createDefaultDocumentReader: vi.fn(),
  }
})

vi.mock('@commonality/sdk/utils', async () => {
  const actual = await vi.importActual('@commonality/sdk/utils')
  return {
    ...actual,
    fetchFromIPFS: vi.fn(),
  }
})

vi.mock('../../shared', async () => {
  const actual = await vi.importActual('../../shared')
  return {
    ...actual,
    loadDisplayDenylist: vi.fn().mockResolvedValue({ deniedCids: [], honoredRetractors: [] }),
  }
})

const cid = 'bafyfundingportalmetadata' as IpfsCidV1
const machinery = { ipfsConfig: {} } as any

function mockRead(result: DocumentReadResult) {
  vi.mocked(createDefaultDocumentReader).mockReturnValue({
    read: vi.fn().mockResolvedValue(result),
  })
}

describe('funding portal project metadata reader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
  })

  it('reads metadata from the CID-first DisplayableDocument seam before legacy IPFS JSON', async () => {
    const document: DisplayableDocument = {
      format: 'markdown-restricted',
      content: 'Fallback project description',
      extras: { name: 'Clean Water Build' },
    }
    mockRead({ status: 'active', document })

    await expect(readProjectMetadata(machinery, cid)).resolves.toEqual({
      name: 'Clean Water Build',
      description: 'Fallback project description',
    })
    expect(fetchFromIPFS).not.toHaveBeenCalled()
  })

  it('suppresses legacy IPFS JSON when PublishedData reports a retraction', async () => {
    mockRead({
      status: 'retracted',
      retractedDocument: { format: 'markdown-restricted', content: 'Retracted' },
    })
    vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Stale copy' })

    await expect(readProjectMetadata(machinery, cid)).resolves.toBeNull()
    expect(fetchFromIPFS).not.toHaveBeenCalled()
  })

  it('keeps a narrow legacy JSON fallback for pre-migration funding-portal metadata', async () => {
    mockRead({ status: 'not-published' })
    vi.mocked(fetchFromIPFS).mockResolvedValue({ title: 'Legacy Project', description: 'Plain JSON metadata' })

    await expect(readProjectMetadata(machinery, cid)).resolves.toEqual({
      name: 'Legacy Project',
      description: 'Plain JSON metadata',
    })
  })
})
