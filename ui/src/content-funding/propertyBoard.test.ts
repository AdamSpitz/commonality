import { describe, expect, it } from 'vitest'
import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import type { ContentAttestationInfo } from './hooks/useContentFundingState'
import {
  applyPropertyBoardScope,
  PROPERTY_BOARD_CAP,
  readHiddenPropertyItems,
  selectPropertyBoardItems,
  writeHiddenPropertyItems,
} from './propertyBoard'

const TOPIC = 'bafy-topic'

function attestation(canonicalId: string, overrides: Partial<ContentAttestationInfo> = {}): ContentAttestationInfo {
  return {
    canonicalId,
    subjectId: '0xsubject',
    attested: true,
    attester: '0x1111111111111111111111111111111111111111',
    statementCid: TOPIC,
    topicStatementCid: TOPIC,
    blockNumber: 10n,
    ...overrides,
  }
}

function channel(items: Array<{ canonicalId: string; status?: 'active' | 'released'; contractStatus?: string; contentId?: bigint }>): ChannelWithCanonicalId {
  return {
    canonicalChannelId: 'twitter:uid:9',
    contracts: [{
      contractAddress: '0xabc',
      status: items[0]?.contractStatus ?? 'active',
      contentItems: items.map((item, index) => ({
        canonicalId: item.canonicalId,
        status: item.status ?? 'active',
        contentId: item.contentId ?? BigInt(index + 1),
        contractAddress: '0xabc',
      })),
    }],
    contentItems: [],
  } as unknown as ChannelWithCanonicalId
}

describe('selectPropertyBoardItems', () => {
  it('keeps posts marked with the property statement and topic by a trusted attester', () => {
    const rows = selectPropertyBoardItems(
      [channel([{ canonicalId: 'twitter:uid:9:1', contractStatus: 'failed', status: 'released' }])],
      new Map([['twitter:uid:9:1', [attestation('twitter:uid:9:1')]]]),
      TOPIC,
      ['0x1111111111111111111111111111111111111111'],
    )
    expect(rows).toEqual([expect.objectContaining({ canonicalId: 'twitter:uid:9:1', inOpenContract: false })])
  })

  it('drops posts whose topic is missing or whose attester is untrusted', () => {
    const rows = selectPropertyBoardItems(
      [channel([
        { canonicalId: 'twitter:uid:9:1' },
        { canonicalId: 'twitter:uid:9:2' },
      ])],
      new Map([
        ['twitter:uid:9:1', [attestation('twitter:uid:9:1', { topicStatementCid: undefined })]],
        ['twitter:uid:9:2', [attestation('twitter:uid:9:2', { attester: '0x2222222222222222222222222222222222222222' })]],
      ]),
      TOPIC,
      ['0x1111111111111111111111111111111111111111'],
    )
    expect(rows).toEqual([])
  })
})

describe('applyPropertyBoardScope', () => {
  const open = {
    canonicalId: 'twitter:uid:9:1',
    channelCanonicalId: 'twitter:uid:9',
    contractAddress: '0xabc',
    inOpenContract: true,
    contentId: 2n,
    sortBlock: 3n,
  }
  const free = {
    canonicalId: 'twitter:uid:9:2',
    channelCanonicalId: 'twitter:uid:8',
    contractAddress: null,
    inOpenContract: false,
    contentId: 1n,
    sortBlock: 9n,
  }

  it('shows only unwrapped posts, hides dismissed ones, and caps the list', () => {
    const many = Array.from({ length: PROPERTY_BOARD_CAP + 5 }, (_, index) => ({
      ...free,
      canonicalId: `twitter:uid:9:${index}`,
      contentId: BigInt(index),
      sortBlock: BigInt(index),
    }))
    const visible = applyPropertyBoardScope([open, ...many], 'unwrapped', {
      hidden: new Set(['twitter:uid:9:2']),
    })
    expect(visible.some((item) => item.inOpenContract)).toBe(false)
    expect(visible.some((item) => item.canonicalId === 'twitter:uid:9:2')).toBe(false)
    expect(visible).toHaveLength(PROPERTY_BOARD_CAP)
    expect(visible[0].contentId).toBe(BigInt(PROPERTY_BOARD_CAP + 4))
  })

  it('limits the following scope to channels the viewer follows', () => {
    const visible = applyPropertyBoardScope([open, free], 'following', {
      followedChannels: new Set(['twitter:uid:9']),
    })
    expect(visible.map((item) => item.canonicalId)).toEqual(['twitter:uid:9:1'])
  })
})

describe('hidden property items', () => {
  it('round-trips through storage', () => {
    const storage = new Map<string, string>()
    const memory = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => { storage.set(key, value) },
    } as unknown as Storage
    writeHiddenPropertyItems(memory, new Set(['twitter:uid:9:1']))
    expect(readHiddenPropertyItems(memory)).toEqual(new Set(['twitter:uid:9:1']))
  })
})
