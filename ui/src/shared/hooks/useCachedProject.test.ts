import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { SDKMachinery, Project, ProjectAccumulator } from '@commonality/sdk'
import type { FoldCacheOptions } from '../foldCache'

vi.mock('../foldCache', () => ({
  loadCachedProjectAccumulator: vi.fn(),
  saveCachedProjectAccumulator: vi.fn(),
}))

vi.mock('./useMachinery', () => ({
  useMachinery: vi.fn(),
}))

const mockGetProject = vi.fn()
vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getProject: mockGetProject,
    PROJECT_FOLD_VERSION: 1,
  }
})

const { loadProjectWithCache } = await import('./useCachedProject')
const { loadCachedProjectAccumulator, saveCachedProjectAccumulator } = await import('../foldCache')

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

const mockProject: Project = {
  id: '1',
  erc1155Address: '0xERC1155',
  recipient: '0xRecipient',
  conditionAddress: '0xCondition',
  metadataCid: 'QmHash',
  createdAt: '2026-01-01',
  blockNumber: '100',
  totalReceived: '500',
  threshold: '1000',
  deadline: '9999999999',
} as unknown as Project

const mockAccumulator: ProjectAccumulator = {
  foldVersion: 1,
  id: '1',
  erc1155Address: '0xERC1155',
  recipient: '0xRecipient',
  conditionAddress: '0xCondition',
  metadataCid: 'QmHash',
  createdAt: '2026-01-01',
  blockNumber: '100',
  totalReceived: 500n,
}

describe('loadProjectWithCache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns null when projectAddress is empty', async () => {
    const result = await loadProjectWithCache(mockMachinery, '', mockCacheOptions)
    expect(result).toBeNull()
    expect(mockGetProject).not.toHaveBeenCalled()
  })

  it('bypasses cache when machinery.eventCacheUrl is missing', async () => {
    const machineryWithoutCache = { ...mockMachinery, eventCacheUrl: undefined } as unknown as SDKMachinery
    mockGetProject.mockResolvedValue(mockProject)

    const result = await loadProjectWithCache(machineryWithoutCache, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
    expect(loadCachedProjectAccumulator).not.toHaveBeenCalled()
    expect(mockGetProject).toHaveBeenCalledWith(machineryWithoutCache, '0xProject')
  })

  it('bypasses cache when machinery.contractAddresses is missing', async () => {
    const machineryWithoutAddresses = { ...mockMachinery, contractAddresses: undefined } as unknown as SDKMachinery
    mockGetProject.mockResolvedValue(mockProject)

    const result = await loadProjectWithCache(machineryWithoutAddresses, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
    expect(loadCachedProjectAccumulator).not.toHaveBeenCalled()
  })

  it('bypasses cache when cacheOptions.contractAddresses is missing', async () => {
    const optionsWithoutAddresses = { ...mockCacheOptions, contractAddresses: undefined } as unknown as Omit<FoldCacheOptions, 'address'>
    mockGetProject.mockResolvedValue(mockProject)

    const result = await loadProjectWithCache(mockMachinery, '0xProject', optionsWithoutAddresses)

    expect(result).toEqual(mockProject)
    expect(loadCachedProjectAccumulator).not.toHaveBeenCalled()
  })

  it('fetches from SDK when no cache exists', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProject.mockResolvedValue(mockProject)

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
    expect(loadCachedProjectAccumulator).toHaveBeenCalled()
    expect(mockGetProject).toHaveBeenCalledWith(mockMachinery, '0xProject')
    expect(saveCachedProjectAccumulator).toHaveBeenCalled()
  })

  it('saves to cache after fresh fetch', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProject.mockResolvedValue(mockProject)

    await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(saveCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xProject' }),
      expect.objectContaining({ id: '1', totalReceived: 500n }),
      '100'
    )
  })

  it('uses cached accumulator when available', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProject.mockResolvedValue(mockProject)

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
    expect(mockGetProject).toHaveBeenCalledWith(mockMachinery, '0xProject', {
      initialAccumulator: mockAccumulator,
      blockNumber_gte: '100',
    })
  })

  it('updates cache when block number changes', async () => {
    const updatedProject = { ...mockProject, blockNumber: '200', totalReceived: '800' }
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProject.mockResolvedValue(updatedProject)

    await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(saveCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xProject' }),
      expect.objectContaining({ blockNumber: '200' }),
      '200'
    )
  })

  it('does not update cache when block number unchanged', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProject.mockResolvedValue(mockProject)

    await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(saveCachedProjectAccumulator).not.toHaveBeenCalled()
  })

  it('returns null when SDK returns null and no cache', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProject.mockResolvedValue(null)

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toBeNull()
    expect(saveCachedProjectAccumulator).not.toHaveBeenCalled()
  })

  it('returns cached result when SDK returns null but cache exists', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProject.mockResolvedValue(null)

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toBeNull()
  })

  it('normalizes address to lowercase in cache key', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProject.mockResolvedValue(mockProject)

    await loadProjectWithCache(mockMachinery, '0xPROJECT', mockCacheOptions)

    expect(loadCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xPROJECT' })
    )
  })

  it('throws when SDK call fails', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProject.mockRejectedValue(new Error('Network error'))

    await expect(loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)).rejects.toThrow('Network error')
  })
})
