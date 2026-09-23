import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LinkedSocialAccountsSection } from './LinkedSocialAccountsSection'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
}))

vi.mock('@commonality/sdk/signer-profiles', () => ({
  getUserSocialData: vi.fn().mockResolvedValue({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isTwitterVerified: false,
    socialDataFetched: true,
  }),
}))

vi.mock('../hooks/useClaimFlow', () => ({
  useClaimFlow: vi.fn(() => ({
    getChallenge: vi.fn(),
    confirmVerification: vi.fn(),
    loading: false,
    error: null,
    clearError: vi.fn(),
  })),
}))

vi.mock('../../shared', () => ({
  useMachinery: vi.fn(() => ({})),
}))

import { useAccount } from 'wagmi'
import { getUserSocialData } from '@commonality/sdk/signer-profiles'
import { useClaimFlow } from '../hooks/useClaimFlow'

const TWITTER_HANDLE_HINTS_KEY = 'commonality:twitterHandleHints'
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678'

describe('LinkedSocialAccountsSection', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as never)
    vi.mocked(getUserSocialData).mockResolvedValue({
      address: ADDRESS,
      isTwitterVerified: false,
      socialDataFetched: true,
    } as never)
    vi.mocked(useClaimFlow).mockReturnValue({
      getChallenge: vi.fn(),
      confirmVerification: vi.fn(),
      loading: false,
      error: null,
      clearError: vi.fn(),
    } as never)
  })

  it('prompts the user to connect a wallet before linking Twitter', () => {
    render(<LinkedSocialAccountsSection />)

    expect(screen.getByText(/connect your wallet to link your twitter/i)).toBeInTheDocument()
  })

  it('loads a saved Twitter handle hint for the connected wallet', async () => {
    localStorage.setItem(TWITTER_HANDLE_HINTS_KEY, JSON.stringify({
      [ADDRESS.toLowerCase()]: '@alice',
    }))
    vi.mocked(useAccount).mockReturnValue({ address: ADDRESS, isConnected: true } as never)

    render(<LinkedSocialAccountsSection />)

    expect(await screen.findByDisplayValue('@alice')).toBeInTheDocument()
  })

  it('requests a verification challenge and confirms the Twitter link', async () => {
    const user = userEvent.setup()
    const getChallenge = vi.fn().mockResolvedValue({
      nonce: 'nonce-123',
      verificationPostTemplate: 'Claiming my funded content #commonality-nonce-123',
    })
    const confirmVerification = vi.fn().mockResolvedValue({ txHash: '0xtx', observedPostId: '1' })

    localStorage.setItem(TWITTER_HANDLE_HINTS_KEY, JSON.stringify({
      [ADDRESS.toLowerCase()]: '@alice',
    }))
    vi.mocked(useAccount).mockReturnValue({ address: ADDRESS, isConnected: true } as never)
    vi.mocked(useClaimFlow).mockReturnValue({
      getChallenge,
      confirmVerification,
      loading: false,
      error: null,
      clearError: vi.fn(),
    } as never)
    vi.mocked(getUserSocialData)
      .mockResolvedValueOnce({
        address: ADDRESS,
        isTwitterVerified: false,
        socialDataFetched: true,
      } as never)
      .mockResolvedValueOnce({
        address: ADDRESS,
        twitterHandle: '@alice',
        isTwitterVerified: true,
        twitterAssociationSource: 'channel-registry',
        socialDataFetched: true,
      } as never)

    render(<LinkedSocialAccountsSection />)

    expect(await screen.findByDisplayValue('@alice')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /get verification tweet/i }))

    expect(getChallenge).toHaveBeenCalledWith('twitter', '@alice', ADDRESS)
    expect(await screen.findByDisplayValue(/claiming my funded content/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /i tweeted it/i }))

    await waitFor(() => {
      expect(confirmVerification).toHaveBeenCalledWith('nonce-123')
    })

    const storedHints = JSON.parse(localStorage.getItem(TWITTER_HANDLE_HINTS_KEY)!)
    expect(storedHints[ADDRESS.toLowerCase()]).toBe('@alice')
  })
})
