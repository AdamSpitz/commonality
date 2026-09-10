import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadUserProjects } from './userProjects'

const { getProject, getUserContributions, getUserCreatedProjects, readLazyGivingProjectMetadata } = vi.hoisted(() => ({
  getProject: vi.fn(),
  getUserContributions: vi.fn(),
  getUserCreatedProjects: vi.fn(),
  readLazyGivingProjectMetadata: vi.fn(),
}))

vi.mock('@commonality/sdk/lazy-giving', () => ({
  getProject,
  getUserContributions,
  getUserCreatedProjects,
}))

vi.mock('@ui/lazy-giving', () => ({
  readLazyGivingProjectMetadata,
  dnsBeneficiaryDomain: (beneficiary?: { namespace?: string; canonicalIdentifier?: string }) =>
    beneficiary?.namespace === 'dns' ? beneficiary.canonicalIdentifier : undefined,
}))

const USER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const PROJECT = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

describe('loadUserProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    getUserContributions.mockResolvedValue([])
    getUserCreatedProjects.mockResolvedValue([])
    getProject.mockResolvedValue({
      id: PROJECT,
      metadataCid: 'bafy1',
      threshold: '1',
      deadline: '1',
      totalReceived: '0',
    })
    readLazyGivingProjectMetadata.mockResolvedValue({
      name: 'Garden beds',
      beneficiary: { namespace: 'dns', canonicalIdentifier: 'example.org' },
    })
  })

  it('includes contributed projects', async () => {
    getUserContributions.mockResolvedValue([{ projectAddress: PROJECT }])
    const machinery = {}
    const rows = await loadUserProjects(machinery as never, USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.title).toBe('Garden beds')
    expect(rows[0]?.websiteDomain).toBe('example.org')
    expect(rows[0]?.relations).toEqual(['contributed'])
  })

  it('includes created projects from indexed ProjectCreated events', async () => {
    getUserCreatedProjects.mockResolvedValue([PROJECT])
    const machinery = {}
    const rows = await loadUserProjects(machinery as never, USER)
    expect(rows[0]?.relations).toEqual(['created'])
  })
})
