import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Project } from '@commonality/sdk/lazy-giving'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { FoldCacheOptions } from '../stores/foldCache'

vi.mock('./useMachinery', () => ({
  useMachinery: vi.fn(),
}))

const mockGetProject = vi.fn()
vi.mock('@commonality/sdk/lazy-giving', async () => {
  const actual = await vi.importActual('@commonality/sdk/lazy-giving')
  return {
    ...actual,
    getProject: mockGetProject,
  }
})

const { loadProjectWithCache } = await import('./useCachedProject')

const mockMachinery = {
  eventCacheUrl: 'https://cache.example.com',
  contractAddresses: {
    assuranceContractFactory: '0xFactory',
  },
} as unknown as SDKMachinery

const mockCacheOptions: Omit<FoldCacheOptions, 'address'> = {
  eventCacheUrl: 'https://cache.example.com',
  contractAddresses: {
    assuranceContractFactory: '0xFactory',
  },
  foldType: 'project',
}

const mockProject = {
  id: '1',
  totalReceived: '500',
} as unknown as Project

describe('loadProjectWithCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns null when projectAddress is empty', async () => {
    const result = await loadProjectWithCache(mockMachinery, '', mockCacheOptions)
    expect(result).toBeNull()
    expect(mockGetProject).not.toHaveBeenCalled()
  })

  it('asks the SDK for the project and leaves resume to the fold store', async () => {
    mockGetProject.mockResolvedValue(mockProject)
    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)
    expect(result).toEqual(mockProject)
    expect(mockGetProject).toHaveBeenCalledWith(mockMachinery, '0xProject')
  })

  it('returns null when the SDK finds no project', async () => {
    mockGetProject.mockResolvedValue(null)
    expect(await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)).toBeNull()
  })

  it('throws when the SDK call fails', async () => {
    mockGetProject.mockRejectedValue(new Error('Network error'))
    await expect(loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)).rejects.toThrow('Network error')
  })
})
