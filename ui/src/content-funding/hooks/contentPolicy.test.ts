import { describe, expect, it, vi } from 'vitest'
import type { PolicyEvaluator } from '@commonality/sdk/policy-lists'
import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import { filterChannelsForPolicy } from './useContentFundingState'

function channel(): ChannelWithCanonicalId {
  const contracts = ['blocked', 'allowed'].map((name) => ({
    contractAddress: `0x${name === 'blocked' ? '1' : '2'.repeat(40)}`,
    project: {
      metadataCid: `bafy-${name}`,
      recipient: `0x${name === 'blocked' ? '3' : '4'.repeat(40)}`,
    },
    contentItems: [{ canonicalId: `twitter:uid:7:${name}`, contractAddress: `0x${name === 'blocked' ? '1' : '2'.repeat(40)}` }],
  }))
  return {
    canonicalChannelId: 'twitter:uid:7',
    contracts,
    contentItems: contracts.flatMap(({ contentItems }) => contentItems),
  } as ChannelWithCanonicalId
}

function evaluator(blockedAction?: 'suppress' | 'exclude-aggregation'): PolicyEvaluator {
  return {
    lookup: vi.fn(),
    evaluate: vi.fn((action: any, request: any) => ({
      decision: (!blockedAction || String(action) === blockedAction) && request.item.cid === 'bafy-blocked' ? 'block' : 'allow',
      assertedBy: [], subjects: [], digest: `0x${'1'.repeat(64)}`, status: 'current',
    })),
  } as PolicyEvaluator
}

describe('filterChannelsForPolicy', () => {
  it('removes a suppressed contract and every content item derived from it', () => {
    const [filtered] = filterChannelsForPolicy([channel()], evaluator(), 'suppress', '31337')
    expect(filtered.contracts.map(({ project }) => project?.metadataCid)).toEqual(['bafy-allowed'])
    expect(filtered.contentItems.map(({ canonicalId }) => canonicalId)).toEqual(['twitter:uid:7:allowed'])
  })

  it('does not conflate aggregation exclusion with render suppression', () => {
    const policy = evaluator('exclude-aggregation')
    expect(filterChannelsForPolicy([channel()], policy, 'suppress', '31337')[0].contracts).toHaveLength(2)
    expect(filterChannelsForPolicy([channel()], policy, 'exclude-aggregation', '31337')[0].contracts).toHaveLength(1)
  })

  it('drops a populated channel when all of its contracts are suppressed', () => {
    const policy = { evaluate: vi.fn(() => ({ decision: 'block' })) } as unknown as PolicyEvaluator
    expect(filterChannelsForPolicy([channel()], policy, 'suppress', '31337')).toEqual([])
  })

  it('removes the blocked contract from every auxiliary retrieval source', () => {
    const [visible] = filterChannelsForPolicy([channel()], evaluator(), 'suppress', '31337')
    const canonicalIds = visible.contracts.flatMap(contract => contract.contentItems.map(item => item.canonicalId))

    expect(canonicalIds).toEqual(['twitter:uid:7:allowed'])
    expect(visible.contracts.find(contract => contract.project?.metadataCid === 'bafy-blocked')).toBeUndefined()
  })
})
