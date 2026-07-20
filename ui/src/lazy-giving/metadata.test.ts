import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { DisplayableDocument, DocumentReadResult } from '@commonality/sdk/displayable-documents'
import { createDefaultDocumentReader } from '@commonality/sdk/displayable-documents'
import { fetchFromIPFS, type IpfsCidV1 } from '@commonality/sdk/utils'
import { readLazyGivingProjectMetadata, readLazyGivingTokenMetadata } from './metadata'

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

const cid = 'bafytestmetadata' as IpfsCidV1
const machinery = { ipfsConfig: {} } as any

function mockRead(result: DocumentReadResult) {
  vi.mocked(createDefaultDocumentReader).mockReturnValue({
    read: vi.fn().mockResolvedValue(result),
  })
}

describe('LazyGiving metadata readers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchFromIPFS).mockResolvedValue(null)
  })

  it('reads project metadata from the CID-first DisplayableDocument seam before legacy IPFS JSON', async () => {
    const document: DisplayableDocument = {
      format: 'markdown-restricted',
      content: 'Fallback description',
      extras: { name: 'Community Garden', updatesUrl: 'https://example.test/updates', channelHandle: '@garden' },
    }
    mockRead({ status: 'active', document })

    await expect(readLazyGivingProjectMetadata(machinery, cid, { deniedCids: [], honoredRetractors: [] })).resolves.toMatchObject({
      name: 'Community Garden',
      description: 'Fallback description',
      updatesUrl: 'https://example.test/updates',
      channelHandle: '@garden',
    })
    expect(fetchFromIPFS).not.toHaveBeenCalled()
  })

  it('suppresses legacy IPFS JSON when PublishedData reports a retraction', async () => {
    const retractedDocument: DisplayableDocument = { format: 'markdown-restricted', content: 'Retracted' }
    mockRead({ status: 'retracted', retractedDocument })
    vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Stale copy' })

    await expect(readLazyGivingProjectMetadata(machinery, cid, { deniedCids: [], honoredRetractors: [] })).resolves.toBeNull()
    expect(fetchFromIPFS).not.toHaveBeenCalled()
  })

  it('keeps the narrow legacy JSON fallback for pre-migration token metadata', async () => {
    mockRead({ status: 'not-published' })
    vi.mocked(fetchFromIPFS).mockResolvedValue({ name: 'Gold Tier', image: 'ipfs://bafyimage' })

    await expect(readLazyGivingTokenMetadata(machinery, cid, { deniedCids: [], honoredRetractors: [] })).resolves.toEqual({
      name: 'Gold Tier',
      image: 'ipfs://bafyimage',
    })
  })

  it('checks the runtime display denylist before either read path', async () => {
    mockRead({ status: 'active', document: { format: 'markdown-restricted', content: 'Denied' } })

    await expect(readLazyGivingProjectMetadata(machinery, cid, { deniedCids: [cid], honoredRetractors: [] })).resolves.toBeNull()
    expect(createDefaultDocumentReader).not.toHaveBeenCalled()
    expect(fetchFromIPFS).not.toHaveBeenCalled()
  })
})
