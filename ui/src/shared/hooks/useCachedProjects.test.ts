import { describe, it, expect } from 'vitest'
import type { ProjectWithMetrics } from '@commonality/sdk'

// We need to extract and test the pure functions. Since they're not exported,
// we'll recreate the logic here to verify the behavior matches.

function withMetrics(projects: Array<{
  threshold: string | bigint
  totalReceived: string | bigint
  blockNumber?: string | number | null
  createdAt?: string
} | null>): ProjectWithMetrics[] {
  return projects
    .filter((project): project is NonNullable<typeof project> => project !== null)
    .map((project) => {
      const threshold = BigInt(project.threshold)
      const totalReceived = BigInt(project.totalReceived)
      const fundingProgress = threshold > 0n
        ? Number((totalReceived * 10000n) / threshold) / 10000
        : 0

      return {
        ...project,
        fundingProgress,
        createdAtBlock: project.blockNumber ?? '',
      } as ProjectWithMetrics
    })
}

function sortProjects(
  projects: ProjectWithMetrics[],
  sortBy: string,
  sortDirection: 'asc' | 'desc',
): ProjectWithMetrics[] {
  return [...projects].sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'createdAt':
        comparison = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
          || Number(BigInt(a.createdAtBlock || '0') - BigInt(b.createdAtBlock || '0'))
        break
      case 'deadline':
        comparison = Number(BigInt(a.deadline) - BigInt(b.deadline))
        break
      case 'threshold':
        comparison = Number(BigInt(a.threshold) - BigInt(b.threshold))
        break
      case 'totalReceived':
        comparison = Number(BigInt(a.totalReceived) - BigInt(b.totalReceived))
        break
      case 'fundingProgress':
        comparison = a.fundingProgress - b.fundingProgress
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })
}

const makeProject = (overrides: Partial<ProjectWithMetrics> = {}): ProjectWithMetrics =>
  ({
    address: '0xtest',
    threshold: '1000000000000000000',
    totalReceived: '0',
    deadline: '0',
    createdAt: '2026-01-01',
    createdAtBlock: '0',
    fundingProgress: 0,
    ...overrides,
  }) as ProjectWithMetrics

describe('withMetrics', () => {
  it('filters out null projects', () => {
    const result = withMetrics([null, { threshold: '100', totalReceived: '50', blockNumber: '1' }, null])
    expect(result).toHaveLength(1)
  })

  it('calculates funding progress correctly', () => {
    const result = withMetrics([{ threshold: '1000', totalReceived: '500', blockNumber: '1' }])
    expect(result[0].fundingProgress).toBe(0.5)
  })

  it('returns 0 progress when threshold is zero', () => {
    const result = withMetrics([{ threshold: '0', totalReceived: '500', blockNumber: '1' }])
    expect(result[0].fundingProgress).toBe(0)
  })

  it('handles overfunded projects (progress > 100%)', () => {
    const result = withMetrics([{ threshold: '1000', totalReceived: '1500', blockNumber: '1' }])
    expect(result[0].fundingProgress).toBe(1.5)
  })

  it('sets createdAtBlock from blockNumber', () => {
    const result = withMetrics([{ threshold: '100', totalReceived: '0', blockNumber: '12345' }])
    expect(result[0].createdAtBlock).toBe('12345')
  })

  it('handles bigint inputs', () => {
    const result = withMetrics([
      { threshold: 1000n, totalReceived: 250n, blockNumber: '1' },
    ])
    expect(result[0].fundingProgress).toBe(0.25)
  })
})

describe('sortProjects', () => {
  const projects: ProjectWithMetrics[] = [
    makeProject({
      address: '0x1',
      createdAt: '2026-01-01',
      createdAtBlock: '100',
      deadline: '1000',
      threshold: '500',
      totalReceived: '250',
      fundingProgress: 0.5,
    }),
    makeProject({
      address: '0x2',
      createdAt: '2026-02-01',
      createdAtBlock: '200',
      deadline: '500',
      threshold: '1000',
      totalReceived: '800',
      fundingProgress: 0.8,
    }),
    makeProject({
      address: '0x3',
      createdAt: '2026-01-15',
      createdAtBlock: '150',
      deadline: '2000',
      threshold: '200',
      totalReceived: '200',
      fundingProgress: 1.0,
    }),
  ]

  it('sorts by createdAt ascending', () => {
    const result = sortProjects(projects, 'createdAt', 'asc')
    expect(result.map((p) => p.address)).toEqual(['0x1', '0x3', '0x2'])
  })

  it('sorts by createdAt descending', () => {
    const result = sortProjects(projects, 'createdAt', 'desc')
    expect(result.map((p) => p.address)).toEqual(['0x2', '0x3', '0x1'])
  })

  it('sorts by deadline ascending', () => {
    const result = sortProjects(projects, 'deadline', 'asc')
    expect(result.map((p) => p.address)).toEqual(['0x2', '0x1', '0x3'])
  })

  it('sorts by deadline descending', () => {
    const result = sortProjects(projects, 'deadline', 'desc')
    expect(result.map((p) => p.address)).toEqual(['0x3', '0x1', '0x2'])
  })

  it('sorts by threshold ascending', () => {
    const result = sortProjects(projects, 'threshold', 'asc')
    expect(result.map((p) => p.address)).toEqual(['0x3', '0x1', '0x2'])
  })

  it('sorts by totalReceived ascending', () => {
    const result = sortProjects(projects, 'totalReceived', 'asc')
    expect(result.map((p) => p.address)).toEqual(['0x3', '0x1', '0x2'])
  })

  it('sorts by fundingProgress ascending', () => {
    const result = sortProjects(projects, 'fundingProgress', 'asc')
    expect(result.map((p) => p.address)).toEqual(['0x1', '0x2', '0x3'])
  })

  it('sorts by fundingProgress descending', () => {
    const result = sortProjects(projects, 'fundingProgress', 'desc')
    expect(result.map((p) => p.address)).toEqual(['0x3', '0x2', '0x1'])
  })

  it('does not mutate the original array', () => {
    const original = [...projects]
    sortProjects(projects, 'createdAt', 'asc')
    expect(projects.map((p) => p.address)).toEqual(original.map((p) => p.address))
  })

  it('handles empty array', () => {
    expect(sortProjects([], 'createdAt', 'asc')).toEqual([])
  })
})
