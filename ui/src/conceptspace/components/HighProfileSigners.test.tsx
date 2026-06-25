import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HighProfileSigners } from './HighProfileSigners'
import { BrowserRouter } from 'react-router-dom'

const mockGetHighProfileSigners = vi.fn()

vi.mock('@commonality/sdk/signer-profiles', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk/signer-profiles')>('@commonality/sdk/signer-profiles')
  return {
    ...actual,
    getHighProfileSigners: (...args: unknown[]) => mockGetHighProfileSigners(...args),
  }
})

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: () => ({ mock: true }),
}))

const testStatementCid = 'bafyTestStatement123'

function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('HighProfileSigners', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing while loading', () => {
    mockGetHighProfileSigners.mockReturnValue(new Promise(() => {}))

    const { container } = renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    expect(container.firstChild).toBeNull()
  })

  it('shows empty state when no high-profile signers found', async () => {
    mockGetHighProfileSigners.mockResolvedValue([])

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('High-Profile Supporters')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/No high-profile supporters yet/),
    ).toBeInTheDocument()
  })

  it('shows empty state with default follower threshold message', async () => {
    mockGetHighProfileSigners.mockResolvedValue([])

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/10K\+ Twitter followers/)).toBeInTheDocument()
    })
  })

  it('shows empty state with custom follower threshold message', async () => {
    mockGetHighProfileSigners.mockResolvedValue([])

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} minFollowers={50000} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/50K\+ Twitter followers/)).toBeInTheDocument()
    })
  })

  it('shows empty state when getHighProfileSigners rejects', async () => {
    mockGetHighProfileSigners.mockRejectedValue(new Error('Network error'))

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/No high-profile supporters yet/)).toBeInTheDocument()
    })
  })

  it('renders signer chips when signers are available', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', twitterHandle: 'alice', followerCount: 50000 },
      { address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', twitterHandle: 'bob', followerCount: 100000 },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument()
      expect(screen.getByText('@bob')).toBeInTheDocument()
    })
  })

  it('formats follower count with M suffix for millions', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', twitterHandle: 'bigshot', followerCount: 2500000 },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('(2.5M followers)')).toBeInTheDocument()
    })
  })

  it('formats follower count with K suffix for thousands', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', twitterHandle: 'midtier', followerCount: 25000 },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('(25.0K followers)')).toBeInTheDocument()
    })
  })

  it('shows truncated address when no twitter handle or ENS', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678' },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('0x123456...')).toBeInTheDocument()
    })
  })

  it('shows ENS name when ENS name set but no twitter handle', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', ensName: 'alice.eth', followerCount: 15000 },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('alice.eth')).toBeInTheDocument()
    })
  })

  it('opens Twitter link when clicking a signer with twitter handle', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', twitterHandle: 'alice', followerCount: 20000 },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument()
    })

    screen.getByText('@alice').click()

    expect(openSpy).toHaveBeenCalledWith('https://x.com/alice', '_blank')
    openSpy.mockRestore()
  })

  it('navigates to user profile when clicking a signer without twitter handle', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', followerCount: 20000 },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('0x123456...')).toBeInTheDocument()
    })

    screen.getByText('0x123456...').click()

    await waitFor(() => {
      expect(window.location.pathname).toContain('/user/')
    })
  })

  it('passes minFollowers to getHighProfileSigners', async () => {
    mockGetHighProfileSigners.mockResolvedValue([])

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} minFollowers={50000} />,
    )

    await waitFor(() => {
      expect(mockGetHighProfileSigners).toHaveBeenCalledWith(
        expect.anything(),
        testStatementCid,
        expect.objectContaining({ minFollowers: 50000 }),
      )
    })
  })

  it('hides follower count when not provided', async () => {
    const signers = [
      { address: '0x1234567890abcdef1234567890abcdef12345678', twitterHandle: 'anonymous' },
    ]
    mockGetHighProfileSigners.mockResolvedValue(signers)

    renderWithRouter(
      <HighProfileSigners statementCid={testStatementCid} />,
    )

    await waitFor(() => {
      expect(screen.getByText('@anonymous')).toBeInTheDocument()
    })
    expect(screen.queryByText(/followers/)).not.toBeInTheDocument()
  })
})
