import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Project, ProjectAccumulator } from '@commonality/sdk/lazy-giving'
import type { SDKMachinery } from '@commonality/sdk/machinery'
import type { FoldCacheOptions } from '../stores/foldCache'

vi.mock('../stores/foldCache', () => ({
  loadCachedProjectAccumulator: vi.fn(),
  saveCachedProjectAccumulator: vi.fn(),
}))

vi.mock('./useMachinery', () => ({
  useMachinery: vi.fn(),
}))

const mockGetProject = vi.fn()
const mockGetProjectFold = vi.fn()
vi.mock('@commonality/sdk/lazy-giving', async () => {
  const actual = await vi.importActual('@commonality/sdk/lazy-giving')
  return {
    ...actual,
    getProject: mockGetProject,
    getProjectFold: mockGetProjectFold,
    PROJECT_FOLD_VERSION: 1,
  }
})

const { loadProjectWithCache } = await import('./useCachedProject')
const { loadCachedProjectAccumulator, saveCachedProjectAccumulator } = await import('../stores/foldCache')

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
  lastEventBlockNumber: '100',
  lastEventLogIndex: 0,
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
    mockGetProjectFold.mockResolvedValue({ project: mockProject, accumulator: mockAccumulator })

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
    expect(loadCachedProjectAccumulator).toHaveBeenCalled()
    expect(mockGetProjectFold).toHaveBeenCalledWith(mockMachinery, '0xProject')
    expect(saveCachedProjectAccumulator).toHaveBeenCalled()
  })

  it('saves the fold accumulator after a fresh fetch', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProjectFold.mockResolvedValue({ project: mockProject, accumulator: mockAccumulator })

    await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(saveCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xProject' }),
      mockAccumulator,
      '100'
    )
  })

  it('resumes from the cached accumulator instead of replaying every event', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProjectFold.mockResolvedValue({ project: mockProject, accumulator: mockAccumulator })

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
    expect(mockGetProjectFold).toHaveBeenCalledWith(mockMachinery, '0xProject', {
      initialAccumulator: mockAccumulator,
      blockNumber_gte: '100',
    })
    expect(saveCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xProject' }),
      mockAccumulator,
      '100'
    )
  })

  it('updates cache when the resumed fold advances the cursor', async () => {
    const updatedProject = { ...mockProject, blockNumber: '200', totalReceived: '800' }
    const updatedAccumulator = {
      ...mockAccumulator,
      blockNumber: '200',
      lastEventBlockNumber: '200',
      lastEventLogIndex: 3,
      totalReceived: 800n,
    }
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProjectFold.mockResolvedValue({ project: updatedProject, accumulator: updatedAccumulator })

    await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(saveCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xProject' }),
      updatedAccumulator,
      '200'
    )
  })

  it('rewrites cache after a resumed fold even when the cursor is unchanged', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProjectFold.mockResolvedValue({ project: mockProject, accumulator: mockAccumulator })

    await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(saveCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xProject' }),
      mockAccumulator,
      '100'
    )
  })

  it('returns null when SDK returns null and no cache', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProjectFold.mockResolvedValue(null)

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toBeNull()
    expect(saveCachedProjectAccumulator).not.toHaveBeenCalled()
  })

  it('still returns the resumed project when no new events arrive', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue({
      accumulator: mockAccumulator,
      blockNumber: '100',
    })
    mockGetProjectFold.mockResolvedValue({ project: mockProject, accumulator: mockAccumulator })

    const result = await loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)

    expect(result).toEqual(mockProject)
  })

  it('passes the original address into the cache key options', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProjectFold.mockResolvedValue({ project: mockProject, accumulator: mockAccumulator })

    await loadProjectWithCache(mockMachinery, '0xPROJECT', mockCacheOptions)

    expect(loadCachedProjectAccumulator).toHaveBeenCalledWith(
      expect.objectContaining({ address: '0xPROJECT' })
    )
  })

  it('throws when SDK call fails', async () => {
    ;(loadCachedProjectAccumulator as any).mockResolvedValue(null)
    mockGetProjectFold.mockRejectedValue(new Error('Network error'))

    await expect(loadProjectWithCache(mockMachinery, '0xProject', mockCacheOptions)).rejects.toThrow('Network error')
  })
})
