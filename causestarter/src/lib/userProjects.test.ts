import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadUserProjects } from './userProjects'

const { getProject, getUserContributions, readLazyGivingProjectMetadata, getRuntimeConfigValue } = vi.hoisted(() => ({
  getProject: vi.fn(),
  getUserContributions: vi.fn(),
  readLazyGivingProjectMetadata: vi.fn(),
  getRuntimeConfigValue: vi.fn(),
}))

vi.mock('@commonality/sdk/lazy-giving', () => ({
  getProject,
  getUserContributions,
}))

vi.mock('@ui/lazy-giving/metadata', () => ({
  readLazyGivingProjectMetadata,
}))

vi.mock('./runtimeConfig', () => ({
  getRuntimeConfigValue,
}))

const USER = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const PROJECT = '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

describe('loadUserProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    getRuntimeConfigValue.mockReturnValue('0xcccccccccccccccccccccccccccccccccccccccc')
    getUserContributions.mockResolvedValue([])
    getProject.mockResolvedValue({
      id: PROJECT,
      metadataCid: 'bafy1',
      threshold: '1',
      deadline: '1',
      totalReceived: '0',
    })
    readLazyGivingProjectMetadata.mockResolvedValue({ name: 'Garden beds' })
  })

  it('includes contributed projects', async () => {
    getUserContributions.mockResolvedValue([{ projectAddress: PROJECT }])
    const machinery = { publicClient: { getLogs: vi.fn().mockResolvedValue([]) } }
    const rows = await loadUserProjects(machinery as never, USER)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.title).toBe('Garden beds')
    expect(rows[0]?.relations).toEqual(['contributed'])
  })

  it('includes created projects from factory logs', async () => {
    const machinery = {
      publicClient: {
        getLogs: vi.fn().mockResolvedValue([{ args: { assuranceContract: PROJECT } }]),
      },
    }
    const rows = await loadUserProjects(machinery as never, USER)
    expect(rows[0]?.relations).toEqual(['created'])
  })
})
