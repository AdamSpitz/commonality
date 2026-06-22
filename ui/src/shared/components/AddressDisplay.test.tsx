import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AddressDisplay } from './AddressDisplay'

const mockGetUserSocialData = vi.fn()

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk')>('@commonality/sdk')
  return {
    ...actual,
    getUserSocialData: (...args: unknown[]) => mockGetUserSocialData(...args),
  }
})

vi.mock('../hooks/useMachinery', () => ({
  useMachinery: () => ({ mock: true }),
}))

const testAddress = '0x1234567890abcdef1234567890abcdef12345678'

describe('AddressDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the raw address when no social data is available', async () => {
    mockGetUserSocialData.mockResolvedValue(null)

    render(<AddressDisplay address={testAddress} />)

    await waitFor(() => {
      expect(screen.getByText(testAddress)).toBeInTheDocument()
    })
  })

  it('renders ENS name when available', async () => {
    mockGetUserSocialData.mockResolvedValue({
      ensName: 'alice.eth',
      twitterHandle: null,
    })

    render(<AddressDisplay address={testAddress} />)

    await waitFor(() => {
      expect(screen.getByText('alice.eth')).toBeInTheDocument()
    })
    expect(screen.queryByText(testAddress)).not.toBeInTheDocument()
  })

  it('renders Twitter handle when available (no ENS)', async () => {
    mockGetUserSocialData.mockResolvedValue({
      ensName: null,
      twitterHandle: '@alice',
    })

    render(<AddressDisplay address={testAddress} />)

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument()
    })
    expect(screen.queryByText(testAddress)).not.toBeInTheDocument()
  })

  it('prefers ENS name over Twitter handle when both are available', async () => {
    mockGetUserSocialData.mockResolvedValue({
      ensName: 'alice.eth',
      twitterHandle: '@alice',
    })

    render(<AddressDisplay address={testAddress} />)

    await waitFor(() => {
      expect(screen.getByText('alice.eth')).toBeInTheDocument()
    })
    expect(screen.queryByText('@alice')).not.toBeInTheDocument()
  })

  it('shows full address below ENS name when showFullAddress is true', async () => {
    mockGetUserSocialData.mockResolvedValue({
      ensName: 'alice.eth',
      twitterHandle: null,
    })

    render(<AddressDisplay address={testAddress} showFullAddress />)

    await waitFor(() => {
      expect(screen.getByText('alice.eth')).toBeInTheDocument()
      expect(screen.getByText(testAddress)).toBeInTheDocument()
    })
  })

  it('shows full address below Twitter handle when showFullAddress is true', async () => {
    mockGetUserSocialData.mockResolvedValue({
      ensName: null,
      twitterHandle: '@alice',
    })

    render(<AddressDisplay address={testAddress} showFullAddress />)

    await waitFor(() => {
      expect(screen.getByText('@alice')).toBeInTheDocument()
      expect(screen.getByText(testAddress)).toBeInTheDocument()
    })
  })

  it('passes twitterHandleHint to getUserSocialData', async () => {
    mockGetUserSocialData.mockResolvedValue(null)

    render(<AddressDisplay address={testAddress} twitterHandleHint="@hint" />)

    await waitFor(() => {
      expect(mockGetUserSocialData).toHaveBeenCalledWith(
        expect.anything(),
        testAddress,
        expect.objectContaining({ twitterHandleHint: '@hint' }),
      )
    })
  })

  it('can explain raw wallet addresses as public onchain identifiers', async () => {
    mockGetUserSocialData.mockResolvedValue(null)

    render(<AddressDisplay address={testAddress} explainAddress />)

    await waitFor(() => {
      expect(screen.getByText(testAddress)).toBeInTheDocument()
    })
    expect(screen.getByText(/public wallet address for the onchain actions/i)).toBeInTheDocument()
    expect(screen.getByText(/not a private key or a payment request/i)).toBeInTheDocument()
  })

  it('refetches when address changes', async () => {
    mockGetUserSocialData.mockResolvedValue(null)
    const { rerender } = render(<AddressDisplay address={testAddress} />)

    await waitFor(() => {
      expect(mockGetUserSocialData).toHaveBeenCalledTimes(1)
    })

    const newAddress = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
    rerender(<AddressDisplay address={newAddress} />)

    await waitFor(() => {
      expect(mockGetUserSocialData).toHaveBeenCalledTimes(2)
    })
  })

  it('silently fails when getUserSocialData rejects', async () => {
    mockGetUserSocialData.mockRejectedValue(new Error('Network error'))

    render(<AddressDisplay address={testAddress} />)

    await waitFor(() => {
      expect(screen.getByText(testAddress)).toBeInTheDocument()
    })
  })
})
