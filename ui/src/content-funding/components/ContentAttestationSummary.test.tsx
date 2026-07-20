import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TRUSTED_CONTENT_ATTESTERS_KEY } from '../../shared'
import { BEAT_AGENT_TRUST_POLICY_KEY, checkTrustPolicyViolation, loadRuntimeConfig } from '../../shared'
import { ContentAttestationSummary } from './ContentAttestationSummary'

const fetchFromIPFSMock = vi.fn()
const publishedDataReadMock = vi.fn()

vi.mock('@commonality/sdk/displayable-documents', () => ({
  createDefaultDocumentReader: () => ({
    read: async (cid: string) => {
      const publishedDataResult = await publishedDataReadMock(cid)
      if (
        publishedDataResult.status === 'active' ||
        publishedDataResult.status === 'retracted' ||
        publishedDataResult.status === 'invalid'
      ) {
        return publishedDataResult
      }
      const document = await fetchFromIPFSMock({}, cid)
      return document ? { status: 'active', document } : { status: 'not-published' }
    },
  }),
}))

vi.mock('@commonality/sdk/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@commonality/sdk/utils')>()
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
    publishedDataReadMock.mockReset()
    publishedDataReadMock.mockResolvedValue({ status: 'not-published' })
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

  it('loads beat-agent explanations through PublishedData when the indexer API is configured', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ VITE_EVENT_CACHE_URL: 'https://indexer.example' }),
    } as Response)
    await loadRuntimeConfig('/config.json')
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
    publishedDataReadMock.mockResolvedValue({
      status: 'active',
      document: {
        reasoning: 'PublishedData-hosted explanation.',
        ambientContextUsed: [{ observation: 'Indexed explanation context.' }],
      },
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

    expect(await screen.findByText(/PublishedData-hosted explanation/)).toBeInTheDocument()
    expect(publishedDataReadMock).toHaveBeenCalledWith('bafy-explanation')
    expect(fetchFromIPFSMock).not.toHaveBeenCalledWith(expect.any(Object), 'bafy-explanation')
  })

  it('opens a full beat-agent audit dialog with all citation details', async () => {
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
      beatId: 'us-political-twitter',
      decision: 'positive',
      confidence: 'high',
      reasoning: 'Full explanation reasoning.',
      localContextUsed: [
        { type: 'parent_post', contentCanonicalId: 'twitter:uid:123:0', summary: 'Parent context summary.' },
        { type: 'reply', contentCanonicalId: 'twitter:uid:123:2', summary: 'Reply context summary.' },
        { type: 'author_recent_post', contentCanonicalId: 'twitter:uid:123:3', summary: 'Recent author context summary.' },
      ],
      ambientContextUsed: [
        {
          observation: 'First ambient observation.',
          observedAt: '2026-05-01T00:00:00Z/2026-05-02T00:00:00Z',
          confidence: 'medium',
          supportingExamples: ['twitter:uid:1:1', 'twitter:uid:2:2'],
          sourceAuthorCount: 2,
          timeSpanHours: 24,
          diversityScore: 0.5,
        },
        { observation: 'Second ambient observation.' },
        { observation: 'Third ambient observation.' },
      ],
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

    await userEvent.click(screen.getByText('US politics beat'))

    expect(await screen.findByRole('dialog', { name: /Beat-agent audit details/ })).toBeInTheDocument()
    expect(await screen.findByText('Beat: us-political-twitter')).toBeInTheDocument()
    expect(screen.getByText('Decision: positive')).toBeInTheDocument()
    expect(screen.getByText('Confidence: high')).toBeInTheDocument()
    expect(screen.getByText(/Recent author context summary/)).toBeInTheDocument()
    expect(screen.getByText(/Third ambient observation/)).toBeInTheDocument()
    expect(screen.getByText(/Some load-bearing ambient context is thinly sourced/)).toBeInTheDocument()
    expect(screen.getAllByText(/thin support/)).not.toHaveLength(0)
    expect(screen.getByText(/Examples: twitter:uid:1:1, twitter:uid:2:2/)).toBeInTheDocument()
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

  it('renders negative attestations as explicit non-supporting results, not green positive chips', async () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
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
            attested: false,
            attester: '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD',
            statementCid: 'bafy-d',
          },
        ]}
      />,
    )

    const chip = screen.getByText('Not attested: Noninflammatory evaluator').closest('.MuiChip-root')
    expect(chip).toHaveClass('MuiChip-colorWarning')
    expect(chip).toHaveClass('MuiChip-outlined')
    expect(screen.queryByText('Noninflammatory evaluator')).not.toBeInTheDocument()

    await userEvent.hover(screen.getByText('Not attested: Noninflammatory evaluator'))
    expect(await screen.findByText('Negative content attestation')).toBeInTheDocument()
    expect(screen.getByText(/did not attest that the content supports/)).toBeInTheDocument()
  })

  it('renders nothing when no attestations are present', () => {
    const { container } = render(<ContentAttestationSummary attestations={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  describe('checkTrustPolicyViolation', () => {
    it('returns false when explanation is null', () => {
      expect(checkTrustPolicyViolation(null, 0.5)).toBe(false)
    })

    it('returns false when threshold is 0', () => {
      const explanation = {
        ambientContextUsed: [{ diversityScore: 0.2 }],
      }
      expect(checkTrustPolicyViolation(explanation, 0)).toBe(false)
    })

    it('returns false when no ambient context has diversity scores', () => {
      const explanation = {
        ambientContextUsed: [{ observation: 'Some observation' }],
      }
      expect(checkTrustPolicyViolation(explanation as { ambientContextUsed: Array<{ diversityScore?: number }> }, 0.5)).toBe(false)
    })

    it('returns false when all scored citations meet the threshold', () => {
      const explanation = {
        ambientContextUsed: [
          { diversityScore: 0.7 },
          { diversityScore: 0.8 },
        ],
      }
      expect(checkTrustPolicyViolation(explanation, 0.5)).toBe(false)
    })

    it('returns true when any scored citation is below the threshold', () => {
      const explanation = {
        ambientContextUsed: [
          { diversityScore: 0.8 },
          { diversityScore: 0.3 },
        ],
      }
      expect(checkTrustPolicyViolation(explanation, 0.5)).toBe(true)
    })

    it('returns false when there are no ambient citations', () => {
      expect(checkTrustPolicyViolation({ ambientContextUsed: [] }, 0.5)).toBe(false)
    })
  })

  it('shows warning chip color when trust policy threshold is exceeded', async () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        kind: 'beat-agent',
        name: 'US politics beat',
        serviceUrl: 'https://beat.example/',
      },
    ]))
    window.localStorage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify({ minAmbientDiversityThreshold: 0.6 }))

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ attestation: { explanationCid: 'bafy-explanation' } }),
    } as Response)
    fetchFromIPFSMock.mockResolvedValue({
      reasoning: 'Some reasoning.',
      ambientContextUsed: [{ observation: 'Low diversity observation.', diversityScore: 0.3 }],
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

    await waitFor(() => {
      const chip = screen.getByText('US politics beat').closest('.MuiChip-root')
      expect(chip).toHaveClass('MuiChip-colorWarning')
    })
  })

  it('shows trust policy warning in tooltip when threshold is exceeded', async () => {
    window.localStorage.setItem(TRUSTED_CONTENT_ATTESTERS_KEY, JSON.stringify([
      {
        address: '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
        kind: 'beat-agent',
        name: 'US politics beat',
        serviceUrl: 'https://beat.example/',
      },
    ]))
    window.localStorage.setItem(BEAT_AGENT_TRUST_POLICY_KEY, JSON.stringify({ minAmbientDiversityThreshold: 0.6 }))

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ attestation: { explanationCid: 'bafy-explanation' } }),
    } as Response)
    fetchFromIPFSMock.mockResolvedValue({
      ambientContextUsed: [{ observation: 'Observation.', diversityScore: 0.3 }],
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

    await waitFor(() => fetch)
    await userEvent.hover(screen.getByText('US politics beat'))
    expect(await screen.findByText(/Below your trust policy/)).toBeInTheDocument()
  })
})
