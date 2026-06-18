import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowseCreatorsPage } from './BrowseCreatorsPage'

vi.mock('react-router-dom', () => ({
  useParams: vi.fn(),
  useNavigate: vi.fn(),
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

vi.mock('../hooks/useContentFundingState', () => ({
  useContentFundingState: vi.fn(),
}))

import { useParams, useNavigate } from 'react-router-dom'
import { useContentFundingState } from '../hooks/useContentFundingState'

function mockContentFundingState(overrides: {
  channels?: unknown[]
  loading?: boolean
  error?: string | null
}) {
  vi.mocked(useContentFundingState).mockReturnValue({
    state: null,
    vetoedEvents: [],
    projects: [],
    channels: overrides.channels ?? [],
    contentAttestations: new Map(),
    loading: overrides.loading ?? false,
    error: overrides.error ?? null,
    machinery: {
      ipfsConfig: { gatewayUrl: 'https://ipfs.io/ipfs', apiUrl: '', shouldUseMock: false, debugIpfs: false },
      testConfig: { areWeJustRunningTests: true },
    },
  } as any)
}

describe('BrowseCreatorsPage', () => {
  const navigate = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ platform: 'twitter' })
    vi.mocked(useNavigate).mockReturnValue(navigate)
  })

  it('renders custom title and description', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage title="My Creators" description="Custom description" />)

    expect(screen.getByText('My Creators')).toBeInTheDocument()
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('renders default title and description', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByText('Creators')).toBeInTheDocument()
  })

  it('shows loading spinner when loading', () => {
    mockContentFundingState({ channels: [], loading: true })

    render(<BrowseCreatorsPage />)

    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('shows error alert when there is an error', () => {
    mockContentFundingState({ channels: [], error: 'Something went wrong' })

    render(<BrowseCreatorsPage />)

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('shows empty state when no channels match filters', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByText(/No creators found/i)).toBeInTheDocument()
  })

  it('navigates to platform tab when clicked', async () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    const user = userEvent.setup()
    const youtubeTab = screen.getByRole('tab', { name: 'YouTube' })
    await user.click(youtubeTab)

    expect(navigate).toHaveBeenCalledWith('/content/youtube')
  })

  it('navigates to Substack tab when clicked', async () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    const user = userEvent.setup()
    const substackTab = screen.getByRole('tab', { name: 'Substack' })
    await user.click(substackTab)

    expect(navigate).toHaveBeenCalledWith('/content/substack')
  })

  it('highlights the active platform tab', () => {
    mockContentFundingState({ channels: [] })
    vi.mocked(useParams).mockReturnValue({ platform: 'youtube' })

    render(<BrowseCreatorsPage />)

    const youtubeTab = screen.getByRole('tab', { name: 'YouTube' })
    expect(youtubeTab).toHaveAttribute('aria-selected', 'true')
  })

  it('shows all three platform tabs', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByRole('tab', { name: 'Twitter / X' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'YouTube' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Substack' })).toBeInTheDocument()
  })

  it('shows sort toggle buttons', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByRole('button', { name: 'Most Funded' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Most Contracts' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Newest Activity' })).toBeInTheDocument()
  })

  it('shows status filter toggle buttons', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Unclaimed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Verified' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Creator-Controlled' })).toBeInTheDocument()
  })

  it('has Most Funded selected by default', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByRole('button', { name: 'Most Funded' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Most Contracts' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('has All status selected by default', () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Unclaimed' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('allows changing sort option', async () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Most Contracts' }))

    expect(screen.getByRole('button', { name: 'Most Contracts' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Most Funded' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('allows changing status filter', async () => {
    mockContentFundingState({ channels: [] })

    render(<BrowseCreatorsPage />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Verified' }))

    expect(screen.getByRole('button', { name: 'Verified' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
  })
})
