import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContentAttestationSummary } from './ContentAttestationSummary'

describe('ContentAttestationSummary', () => {
  it('renders one chip per attester in stable order', () => {
    render(
      <ContentAttestationSummary
        attestations={[
          {
            canonicalId: 'twitter:uid:123:1',
            subjectId: '0xsubject',
            attested: true,
            attester: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
            statementCid: 'bafy-b',
          },
          {
            canonicalId: 'twitter:uid:123:1',
            subjectId: '0xsubject',
            attested: true,
            attester: '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
            statementCid: 'bafy-a',
          },
        ]}
      />,
    )

    const chips = screen.getAllByText(/0x[A-F0-9a-f]{4}\.\.\.[A-F0-9a-f]{4}/)
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveTextContent('0xAAAA...AAAA')
    expect(chips[1]).toHaveTextContent('0xBBBB...BBBB')
  })

  it('renders nothing when no attestations are present', () => {
    const { container } = render(<ContentAttestationSummary attestations={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
