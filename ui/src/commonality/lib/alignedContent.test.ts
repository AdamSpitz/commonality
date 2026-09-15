import { describe, expect, it } from 'vitest'
import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import {
  contentChannelPath,
  contentItemPublicUrl,
  selectAlignedContentContracts,
  selectAlignedContentItems,
} from './alignedContent'

const STATEMENT_A = 'bafy-a'
const STATEMENT_B = 'bafy-b'

function channel(overrides: Partial<ChannelWithCanonicalId> = {}): ChannelWithCanonicalId {
  return {
    channelId: 1n,
    canonicalChannelId: 'twitter:uid:1',
    channel: { state: 'verified' } as ChannelWithCanonicalId['channel'],
    contracts: [{
      contractAddress: '0xabc',
      status: 'active',
      isThirdParty: false,
      contentItems: [
        { canonicalId: 'twitter:uid:1:111', status: 'submitted' },
        { canonicalId: 'twitter:uid:1:222', status: 'submitted' },
      ],
    }],
    contentItems: [],
    ...overrides,
  } as ChannelWithCanonicalId
}

describe('selectAlignedContentItems', () => {
  it('keeps items with a positive attestation to a wanted statement', () => {
    const attestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        subjectId: 'x',
        attested: true,
        attester: '0x1',
        statementCid: STATEMENT_A,
      }]],
      ['twitter:uid:1:222', [{
        canonicalId: 'twitter:uid:1:222',
        subjectId: 'x',
        attested: true,
        attester: '0x1',
        statementCid: STATEMENT_B,
      }]],
    ])

    const rows = selectAlignedContentItems([channel()], attestations, [STATEMENT_A])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.canonicalId).toBe('twitter:uid:1:111')
    expect(rows[0]?.statementCids).toEqual([STATEMENT_A])
  })

  it('drops items attested only by an untrusted wallet', () => {
    const attestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        subjectId: 'x',
        attested: true,
        attester: '0xuntrusted',
        statementCid: STATEMENT_A,
      }]],
    ])
    expect(selectAlignedContentItems([channel()], attestations, [STATEMENT_A], ['0xtrusted'])).toEqual([])
  })

  it('ignores retracted or off-topic attestations', () => {
    const attestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        subjectId: 'x',
        attested: false,
        attester: '0x1',
        statementCid: STATEMENT_A,
      }]],
    ])
    expect(selectAlignedContentItems([channel()], attestations, [STATEMENT_A])).toEqual([])
  })

  it('matches a raw PublishedData CID against a dag-pb decoded alignment CID', () => {
    const rosterCid = 'bafkreiccc5wjz3uw6ag2qdu25ftvqp3tt5txt5ornuvtcnjibwdx4mf74e'
    const decodedCid = 'bafybeiccc5wjz3uw6ag2qdu25ftvqp3tt5txt5ornuvtcnjibwdx4mf74e'
    const attestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        subjectId: 'x',
        attested: true,
        attester: '0x1',
        statementCid: decodedCid,
      }]],
    ])
    expect(selectAlignedContentItems([channel()], attestations, [rosterCid])).toHaveLength(1)
  })
})

describe('selectAlignedContentContracts', () => {
  it('groups aligned items by contract and counts mixed batches', () => {
    const attestations = new Map([
      ['twitter:uid:1:111', [{
        canonicalId: 'twitter:uid:1:111',
        subjectId: 'x',
        attested: true,
        attester: '0x1',
        statementCid: STATEMENT_A,
      }]],
    ])
    const rows = selectAlignedContentContracts([channel()], attestations, [STATEMENT_A])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.contractAddress).toBe('0xabc')
    expect(rows[0]?.alignedItemCount).toBe(1)
    expect(rows[0]?.contentItemCount).toBe(2)
    expect(rows[0]?.viaStatementCids).toEqual([STATEMENT_A])
  })
})

describe('content URLs', () => {
  it('builds public and in-app channel links', () => {
    expect(contentItemPublicUrl('twitter:uid:9:12345')).toBe('https://x.com/i/web/status/12345')
    expect(contentChannelPath('twitter:uid:9')).toBe('/content/twitter/twitter%3Auid%3A9')
  })
})
