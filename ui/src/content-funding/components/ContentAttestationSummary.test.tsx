import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRUSTED_CONTENT_ATTESTERS_KEY } from '../../shared/hooks/useTrustedContentAttesters'
import { ContentAttestationSummary } from './ContentAttestationSummary'

describe('ContentAttestationSummary', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubEnv('VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS', '')
    vi.stubEnv('VITE_DEFAULT_TRUSTED_BEAT_AGENTS', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

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

  it('highlights trusted beat agents by configured name with brain icon', () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        kind: 'beat-agent',
        name: 'US politics beat',
      },
    ]))

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

    expect(screen.getByText('US politics beat')).toBeInTheDocument()
    const beatChip = screen.getByText('US politics beat').closest('.MuiChip-root')
    expect(beatChip).toHaveClass('MuiChip-filled')
    // Beat agents get a 'primary' color (blue) to distinguish them from green content-attester chips
    expect(screen.getByText('US politics beat').closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary')
    expect(screen.getByText('0xAAAA...AAAA').closest('.MuiChip-root')).toHaveClass('MuiChip-outlined')
  })

  it('highlights trusted content attesters with green chips', () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
        kind: 'content-attester',
        name: 'Noninflammatory evaluator',
      },
    ]))

    render(
      <ContentAttestationSummary
        attestations={[
          {
            canonicalId: 'twitter:uid:123:1',
            subjectId: '0xsubject',
            attested: true,
            attester: '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
            statementCid: 'bafy-c',
          },
        ]}
      />,
    )

    expect(screen.getByText('Noninflammatory evaluator')).toBeInTheDocument()
    expect(screen.getByText('Noninflammatory evaluator').closest('.MuiChip-root')).toHaveClass('MuiChip-colorSuccess')
  })

  it('renders nothing when no attestations are present', () => {
    const { container } = render(<ContentAttestationSummary attestations={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
