import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRUSTED_CONTENT_ATTESTERS_KEY } from '../../shared/hooks/useTrustedContentAttesters'
import { ContentAttestationSummary } from './ContentAttestationSummary'

const fetchFromIPFSMock = vi.fn()

vi.mock('@commonality/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@commonality/sdk')>()
  return {
    ...actual,
    fetchFromIPFS: (...args: unknown[]) => fetchFromIPFSMock(...args),
  }
})

describe('ContentAttestationSummary', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.stubEnv('VITE_DEFAULT_TRUSTED_CONTENT_ATTESTERS', '')
    vi.stubEnv('VITE_DEFAULT_TRUSTED_BEAT_AGENTS', '')
    fetchFromIPFSMock.mockReset()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
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

  it('loads beat-agent explanation and context citations when a service URL is configured', async () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        kind: 'beat-agent',
        name: 'US politics beat',
        serviceUrl: 'https://beat.example/',
      },
    ]))
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ attestation: { explanationCid: 'bafy-explanation' } }),
    } as Response)
    fetchFromIPFSMock.mockResolvedValue({
      reasoning: 'The post affirms the target statement without escalating hostility.',
      localContextUsed: [{ summary: 'The parent post asked for practical compromise.' }],
      ambientContextUsed: [{
        observation: 'The phrase is usually used sincerely in this beat this week.',
        sourceAuthorCount: 4,
        timeSpanHours: 36,
        diversityScore: 0.82,
      }],
    })

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
        ]}
      />,
    )

    await userEvent.hover(screen.getByText('US politics beat'))

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('https://beat.example/status/bafy-b/twitter%3Auid%3A123%3A1'))
    expect(fetchFromIPFSMock).toHaveBeenCalledWith(expect.any(Object), 'bafy-explanation')
    expect(await screen.findByText(/The post affirms the target statement/)).toBeInTheDocument()
    expect(screen.getByText(/The parent post asked/)).toBeInTheDocument()
    expect(screen.getByText(/4 authors/)).toBeInTheDocument()
    expect(screen.getByText(/36h span/)).toBeInTheDocument()
    expect(screen.getByText(/diversity 0.82/)).toBeInTheDocument()
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
