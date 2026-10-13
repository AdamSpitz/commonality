import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ChannelWithCanonicalId } from '@commonality/sdk/content-funding'
import { PropertyBoardPage } from './PropertyBoardPage'
import { HIDDEN_PROPERTY_ITEMS_KEY } from '../propertyBoard'

vi.mock('../../shared', () => ({
  getRuntimeConfigValue: () => 'bafy-topic',
  loadTrustedContentAttesters: () => [{ address: '0x1111111111111111111111111111111111111111', kind: 'content-attester' }],
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: () => ({
    loading: false,
    error: null,
    channels: [{
      canonicalChannelId: 'twitter:uid:9',
      contracts: [{
        contractAddress: '0xabc',
        status: 'failed',
        contentItems: [{
          canonicalId: 'twitter:uid:9:77',
          status: 'released',
          contentId: 7n,
          contractAddress: '0xabc',
        }],
      }],
      contentItems: [],
    } as unknown as ChannelWithCanonicalId],
    contentAttestations: new Map([[
      'twitter:uid:9:77',
      [{
        canonicalId: 'twitter:uid:9:77',
        subjectId: '0x',
        attested: true,
        attester: '0x1111111111111111111111111111111111111111',
        statementCid: 'bafy-topic',
        topicStatementCid: 'bafy-topic',
        blockNumber: 4n,
      }],
    ]]),
  }),
}))

describe('PropertyBoardPage', () => {
  beforeEach(() => {
    window.localStorage.removeItem(HIDDEN_PROPERTY_ITEMS_KEY)
  })

  it('lists an attested post and hides it for this browser', async () => {
    render(
      <MemoryRouter>
        <PropertyBoardPage propertyId="civility" />
      </MemoryRouter>,
    )

    expect(screen.getByText('twitter:uid:9:77')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Hide' }))
    expect(screen.queryByText('twitter:uid:9:77')).not.toBeInTheDocument()
    expect(screen.getByText(/no attested posts/i)).toBeInTheDocument()
  })
})
