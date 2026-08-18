import { describe, expect, it } from 'vitest'
import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import { selectAlignedContentContracts } from './selectAlignedContent'

const STATEMENT = 'bafy-a'

function channel(): ChannelWithCanonicalId {
  return {
    channelId: 1n,
    canonicalChannelId: 'twitter:uid:1',
    channel: { state: 'verified' },
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
  } as unknown as ChannelWithCanonicalId
}

describe('selectAlignedContentContracts', () => {
  it('returns one contract row for mixed aligned batches', () => {
    const rows = selectAlignedContentContracts(
      [channel()],
      new Map([
        ['twitter:uid:1:111', [{
          canonicalId: 'twitter:uid:1:111',
          subjectId: 'x',
          attested: true,
          attester: '0x1',
          statementCid: STATEMENT,
        }]],
      ]),
      [STATEMENT],
    )
    expect(rows).toEqual([expect.objectContaining({
      contractAddress: '0xabc',
      alignedItemCount: 1,
      contentItemCount: 2,
      viaStatementCids: [STATEMENT],
    })])
  })

  it('ignores attestations from untrusted attesters when a trust set is configured', () => {
    const rows = selectAlignedContentContracts(
      [channel()],
      new Map([
        ['twitter:uid:1:111', [{
          canonicalId: 'twitter:uid:1:111',
          subjectId: 'x',
          attested: true,
          attester: '0xuntrusted',
          statementCid: STATEMENT,
        }]],
      ]),
      [STATEMENT],
      ['0xtrusted'],
    )
    expect(rows).toEqual([])
  })

  it('matches roster raw CIDs with dag-pb decoded alignment CIDs', () => {
    const rosterCid = 'bafkreiccc5wjz3uw6ag2qdu25ftvqp3tt5txt5ornuvtcnjibwdx4mf74e'
    const decodedCid = 'bafybeiccc5wjz3uw6ag2qdu25ftvqp3tt5txt5ornuvtcnjibwdx4mf74e'
    const rows = selectAlignedContentContracts(
      [channel()],
      new Map([
        ['twitter:uid:1:111', [{
          canonicalId: 'twitter:uid:1:111',
          subjectId: 'x',
          attested: true,
          attester: '0x1',
          statementCid: decodedCid,
        }]],
      ]),
      [rosterCid],
    )
    expect(rows).toHaveLength(1)
  })

  it('treats an empty trust set as unfiltered', () => {
    const rows = selectAlignedContentContracts(
      [channel()],
      new Map([
        ['twitter:uid:1:111', [{
          canonicalId: 'twitter:uid:1:111',
          subjectId: 'x',
          attested: true,
          attester: '0xanyone',
          statementCid: STATEMENT,
        }]],
      ]),
      [STATEMENT],
      [],
    )
    expect(rows).toHaveLength(1)
  })
})
