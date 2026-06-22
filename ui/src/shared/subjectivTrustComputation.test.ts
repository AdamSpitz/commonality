import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computeSubjectivTrustedSetResult } from './subjectivTrustComputation'
import { getDirectTrustMapping, getTransitiveTrustMapping } from '@commonality/sdk'

vi.mock('@commonality/sdk', () => ({
  getDirectTrustMapping: vi.fn(),
  getTransitiveTrustMapping: vi.fn(),
}))

const contractAddresses = {
  beliefs: '0x1111111111111111111111111111111111111111',
  implications: '0x2222222222222222222222222222222222222222',
  assuranceContractFactory: '0x3333333333333333333333333333333333333333',
  erc1155Factory: '0x4444444444444444444444444444444444444444',
  marketplaceFactory: '0x5555555555555555555555555555555555555555',
  delegatableNotes: '0x6666666666666666666666666666666666666666',
  noteIntent: '0x7777777777777777777777777777777777777777',
  alignmentAttestations: '0x8888888888888888888888888888888888888888',
  mutableRefUpdater: '0x9999999999999999999999999999999999999999',
  trustRegistry: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
} as const

describe('computeSubjectivTrustedSetResult', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes the root direct trust mapping before reusing cached descendants', async () => {
    vi.mocked(getDirectTrustMapping).mockResolvedValue(
      new Map([['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90]])
    )
    vi.mocked(getTransitiveTrustMapping).mockImplementation(async (_machinery, address, options) => {
      expect(address).toBe('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')
      expect(options?.directTrustCache?.get('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toEqual(
        new Map([['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90]])
      )
      expect(options?.directTrustCache?.get('0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')).toEqual(
        new Map([['0xcccccccccccccccccccccccccccccccccccccccc', 80]])
      )
      return new Map([
        ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90],
        ['0xcccccccccccccccccccccccccccccccccccccccc', 72],
      ])
    })

    const result = await computeSubjectivTrustedSetResult({
      address: '0xAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAaAa',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
      cachedDirectTrustMappings: {
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [
          { trustee: '0xdddddddddddddddddddddddddddddddddddddddd', score: 10 },
        ],
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': [
          { trustee: '0xcccccccccccccccccccccccccccccccccccccccc', score: 80 },
        ],
      },
    })

    expect(result).toEqual({
      hasDirectTrust: true,
      trustedSet: [
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        '0xcccccccccccccccccccccccccccccccccccccccc',
      ],
      trustWeights: {
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 90,
        '0xcccccccccccccccccccccccccccccccccccccccc': 72,
      },
      directTrustMappings: {
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [
          { trustee: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', score: 90 },
        ],
        '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': [
          { trustee: '0xcccccccccccccccccccccccccccccccccccccccc', score: 80 },
        ],
      },
    })
  })

  it('persists an empty root mapping when no direct trust exists', async () => {
    vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())

    const result = await computeSubjectivTrustedSetResult({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
    })

    expect(getTransitiveTrustMapping).not.toHaveBeenCalled()
    expect(result).toEqual({
      hasDirectTrust: false,
      trustedSet: [],
      directTrustMappings: {
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa': [],
      },
    })
  })

  it('forwards partial trusted-set progress updates from the SDK traversal', async () => {
    vi.mocked(getDirectTrustMapping).mockResolvedValue(
      new Map([['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90]])
    )
    vi.mocked(getTransitiveTrustMapping).mockImplementation(async (_machinery, _address, options) => {
      options?.onProgress?.(
        new Map([['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90]])
      )
      options?.onProgress?.(
        new Map([
          ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90],
          ['0xcccccccccccccccccccccccccccccccccccccccc', 45],
        ])
      )

      return new Map([
        ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', 90],
        ['0xcccccccccccccccccccccccccccccccccccccccc', 45],
      ])
    })

    const progressUpdates: Array<{ hasDirectTrust: boolean; trustedSet: string[] }> = []

    await computeSubjectivTrustedSetResult({
      address: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      eventCacheUrl: 'http://localhost:42069/api',
      contractAddresses,
      onProgress: update => {
        progressUpdates.push(update)
      },
    })

    expect(progressUpdates).toEqual([
      {
        hasDirectTrust: true,
        trustedSet: ['0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'],
        trustWeights: { '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 90 },
      },
      {
        hasDirectTrust: true,
        trustedSet: [
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          '0xcccccccccccccccccccccccccccccccccccccccc',
        ],
        trustWeights: {
          '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb': 90,
          '0xcccccccccccccccccccccccccccccccccccccccc': 45,
        },
      },
    ])
  })
})
