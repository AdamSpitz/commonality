import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { YourNudgersAndNudges } from './YourNudgersAndNudges'

const { getNudgerPublications, getStatementWithContent, useTrustedNudgers, machinery } = vi.hoisted(() => ({
  getNudgerPublications: vi.fn(),
  getStatementWithContent: vi.fn(),
  useTrustedNudgers: vi.fn(),
  machinery: { contractAddresses: { nudgePublications: '0x1' } },
}))

vi.mock('@commonality/sdk/nudger-publications', () => ({
  getNudgerPublications,
  foldNudgeBatchPublications: vi.fn((publications: Array<{ kind: string; nudges: unknown[]; revocations: unknown[]; nudger: string; publishedAt: number; publicationCid: string }>) =>
    publications.flatMap((publication) =>
      publication.nudges.map((nudge) => ({
        ...(nudge as object),
        nudger: publication.nudger,
        publishedAt: publication.publishedAt,
        publicationCid: publication.publicationCid,
      })),
    ),
  ),
}))

vi.mock('@commonality/sdk/conceptspace', () => ({
  getStatementWithContent,
}))

vi.mock('@ui/shared', () => ({
  useTrustedNudgers,
  useMachinery: () => machinery,
  HeaderInfoTip: () => null,
}))

describe('YourNudgersAndNudges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTrustedNudgers.mockReturnValue([])
    getNudgerPublications.mockResolvedValue([])
    getStatementWithContent.mockResolvedValue(null)
  })

  it('explains the empty state when no suggesters are subscribed', () => {
    render(
      <MemoryRouter>
        <YourNudgersAndNudges />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('home-nudgers')).toBeInTheDocument()
    expect(screen.getByText(/No suggesters yet/)).toBeInTheDocument()
    expect(screen.getByText(/No suggestions/)).toBeInTheDocument()
    expect(getNudgerPublications).not.toHaveBeenCalled()
  })

  it('shows a short empty suggestions line when subscribed suggesters have published none', async () => {
    useTrustedNudgers.mockReturnValue([
      { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Housing mediator' },
    ])
    getNudgerPublications.mockResolvedValue([])

    render(
      <MemoryRouter>
        <YourNudgersAndNudges />
      </MemoryRouter>,
    )

    expect(await screen.findByText(/No suggestions/)).toBeInTheDocument()
    expect(screen.queryByText(/No published suggestions/)).not.toBeInTheDocument()
  })

  it('lists subscribed suggesters and their recent suggestions', async () => {
    useTrustedNudgers.mockReturnValue([
      { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', name: 'Housing mediator' },
    ])
    getNudgerPublications.mockResolvedValue([
      {
        kind: 'nudge-batch',
        nudger: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        publishedAt: 100,
        publicationCid: 'bafy1',
        revocations: [],
        nudges: [{
          targetStatementCid: 'bafytarget',
          suggestedStatementCid: 'bafysuggested',
          reason: 'Neighbors already signed this.',
          confidence: 0.8,
        }],
      },
    ])
    getStatementWithContent.mockImplementation(async (_machinery: unknown, cid: string) => {
      if (cid === 'bafysuggested') {
        return { content: { content: 'Fund sidewalk repairs on Oak Street.' } }
      }
      return { content: { content: 'A plank you already support.' } }
    })

    render(
      <MemoryRouter>
        <YourNudgersAndNudges />
      </MemoryRouter>,
    )

    expect(await screen.findByTestId('home-nudger')).toHaveTextContent('Housing mediator')
    expect(await screen.findByTestId('home-nudge')).toHaveTextContent('Fund sidewalk repairs on Oak Street.')
    expect(screen.getByText('Neighbors already signed this.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fund sidewalk repairs on Oak Street.' })).toHaveAttribute(
      'href',
      '/statement/bafysuggested',
    )
  })
})
