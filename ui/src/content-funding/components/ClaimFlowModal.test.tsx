import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClaimFlowModal } from './ClaimFlowModal'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('../hooks/useClaimFlow', () => ({
  useClaimFlow: vi.fn(),
}))

vi.mock('@commonality/sdk/abis', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk/abis')>('@commonality/sdk/abis')
  return {
    ...actual,
    ChannelEscrowAbi: [],
    ChannelRegistryAbi: [],
  }
})

vi.mock('@commonality/sdk/content-funding', async () => {
  const actual = await vi.importActual<typeof import('@commonality/sdk/content-funding')>('@commonality/sdk/content-funding')
  return {
    ...actual,
    withdrawFromEscrow: vi.fn(),
    takeChannelControl: vi.fn(),
    hashCanonicalId: vi.fn((id: string) => id),
  }
})

import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { useClaimFlow } from '../hooks/useClaimFlow'
import { withdrawFromEscrow, takeChannelControl } from '@commonality/sdk/content-funding'

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  channelDisplayName: '@testuser',
  channelId: 'twitter:uid:123:456',
  platform: 'twitter',
  handle: '@testuser',
  claimantAddress: '0x1234567890abcdef1234567890abcdef12345678',
  escrowBalance: 1000000000000000000n,
  channelState: 'unclaimed' as const,
  onSuccess: vi.fn(),
}

function setupChallengeMocks(overrides: {
  getChallengeResult?: unknown
  confirmVerificationResult?: unknown
  apiLoading?: boolean
  apiError?: { message: string } | null
} = {}) {
  const getChallenge = vi.fn().mockResolvedValue(overrides.getChallengeResult ?? {
    nonce: 'abc123',
    verificationPostTemplate: 'Verify: abc123',
    channelId: 'twitter:uid:123:456',
  })
  const confirmVerification = vi.fn().mockResolvedValue(overrides.confirmVerificationResult ?? null)
  vi.mocked(useClaimFlow).mockReturnValue({
    getChallenge,
    confirmVerification,
    loading: overrides.apiLoading ?? false,
    error: overrides.apiError ?? null,
    clearError: vi.fn(),
  } as any)
  return { getChallenge, confirmVerification }
}

describe('ClaimFlowModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: false } as any)
    vi.mocked(useWalletClient).mockReturnValue({ data: undefined } as any)
    vi.mocked(usePublicClient).mockReturnValue(null as any)
    vi.mocked(useClaimFlow).mockReturnValue({
      getChallenge: vi.fn(),
      confirmVerification: vi.fn(),
      loading: false,
      error: null,
      clearError: vi.fn(),
    } as any)
  })

  it('renders modal title with channel display name', () => {
    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByText('Claim Funds for @testuser')).toBeInTheDocument()
  })

  it('renders as a dialog with accessible name', () => {
    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows connect wallet step when not connected', () => {
    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByText('Connect your wallet')).toBeInTheDocument()
    expect(screen.getByText(/To verify your identity and claim these funds/)).toBeInTheDocument()
  })

  it('shows verification step when wallet is connected', () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByText('Verify your identity')).toBeInTheDocument()
    expect(screen.getByText(/Verify that you own the "@testuser" account/)).toBeInTheDocument()
  })

  it('shows "Get Verification Tweet" button on verification step', () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Get Verification Tweet' })).toBeInTheDocument()
  })

  it('calls getChallenge when clicking verification button', async () => {
    const { getChallenge } = setupChallengeMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    expect(getChallenge).toHaveBeenCalledWith('twitter', '@testuser', '0x1234567890abcdef1234567890abcdef12345678')
  })

  it('shows challenge text after getting verification challenge', async () => {
    setupChallengeMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByText('Verify: abc123')).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Open X to Tweet' })).toBeInTheDocument()
  })

  it('shows tweet URL input for Twitter platform after challenge', async () => {
    setupChallengeMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })
  })

  it('shows "I Tweeted It" button for Twitter platform', async () => {
    setupChallengeMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'I Tweeted It' })).toBeInTheDocument()
    })
  })

  it('shows platform-specific instructions for YouTube', async () => {
    setupChallengeMocks({
      getChallengeResult: {
        nonce: 'abc123',
        verificationPostTemplate: 'Verify: abc123',
        channelId: 'youtube:channel:abc123:XYZ',
      },
    })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} platform="youtube" handle="@mychannel" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByText(/Add the following to your video description/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Open YouTube Studio' })).toBeInTheDocument()
  })

  it('shows "I Added It" button for YouTube platform', async () => {
    setupChallengeMocks({
      getChallengeResult: {
        nonce: 'abc123',
        verificationPostTemplate: 'Verify: abc123',
        channelId: 'youtube:channel:abc123:XYZ',
      },
    })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} platform="youtube" handle="@mychannel" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'I Added It' })).toBeInTheDocument()
    })
  })

  it('shows platform-specific instructions for Substack', async () => {
    setupChallengeMocks({
      getChallengeResult: {
        nonce: 'abc123',
        verificationPostTemplate: 'Verify: abc123',
        channelId: 'substack:mysubstack/post-slug',
      },
    })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} platform="substack" handle="mysubstack" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByText(/Publish the following post on your Substack/)).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: 'Open Substack Editor' })).toBeInTheDocument()
  })

  it('shows "I Published It" button for Substack platform', async () => {
    setupChallengeMocks({
      getChallengeResult: {
        nonce: 'abc123',
        verificationPostTemplate: 'Verify: abc123',
        channelId: 'substack:mysubstack/post-slug',
      },
    })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} platform="substack" handle="mysubstack" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'I Published It' })).toBeInTheDocument()
    })
  })

  it('does not show tweet URL input for YouTube platform', async () => {
    setupChallengeMocks({
      getChallengeResult: {
        nonce: 'abc123',
        verificationPostTemplate: 'Verify: abc123',
        channelId: 'youtube:channel:abc:XYZ',
      },
    })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} platform="youtube" handle="@mychannel" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('https://x.com/username/status/...')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/After adding the text above to your video description/)).toBeInTheDocument()
  })

  it('does not show tweet URL input for Substack platform', async () => {
    setupChallengeMocks({
      getChallengeResult: {
        nonce: 'abc123',
        verificationPostTemplate: 'Verify: abc123',
        channelId: 'substack:mysubstack/post-slug',
      },
    })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} platform="substack" handle="mysubstack" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('https://x.com/username/status/...')).not.toBeInTheDocument()
    })
    expect(screen.getByText(/After publishing the post/)).toBeInTheDocument()
  })

  it('shows error alert when challenge fetch fails', async () => {
    const getChallenge = vi.fn().mockResolvedValue(null)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(useClaimFlow).mockReturnValue({
      getChallenge,
      confirmVerification: vi.fn(),
      loading: false,
      error: { message: 'API error' },
      clearError: vi.fn(),
    } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('API error')
    })
  })

  it('shows loading state on verification button when apiLoading is true', () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(useClaimFlow).mockReturnValue({
      getChallenge: vi.fn(),
      confirmVerification: vi.fn(),
      loading: true,
      error: null,
      clearError: vi.fn(),
    } as any)

    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByRole('button', { name: 'Get Verification Tweet' })).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('calls confirmVerification when clicking "I Tweeted It"', async () => {
    const { confirmVerification } = setupChallengeMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    expect(confirmVerification).toHaveBeenCalledWith('abc123')
  })

  it('disables "I Tweeted It" button when tweet URL is empty', async () => {
    setupChallengeMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'I Tweeted It' })).toBeDisabled()
    })
  })

  it('shows confirmation error when verification returns null', async () => {
    setupChallengeMocks({ confirmVerificationResult: null })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByText('Verification failed. Please make sure you have tweeted the challenge.')).toBeInTheDocument()
    })
  })

  it('shows withdraw step with ETH amount for verified channel after verification', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Withdraw Funds' })).toBeInTheDocument()
    })
    expect(screen.getByText('1 ETH')).toBeInTheDocument()
  })

  it('shows "Withdraw to Wallet" button for verified channel', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })
  })

  it('calls withdrawFromEscrow when clicking withdraw button', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useWalletClient).mockReturnValue({
      data: { account: { address: '0xuser' } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(withdrawFromEscrow).mockResolvedValue({ hash: '0xwithdraw' })

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Withdraw to Wallet' }))

    await waitFor(() => {
      expect(withdrawFromEscrow).toHaveBeenCalled()
    })
  })

  it('shows withdraw error when withdraw fails', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useWalletClient).mockReturnValue({
      data: { account: { address: '0xuser' } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(withdrawFromEscrow).mockRejectedValue(new Error('Withdraw failed'))

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Withdraw to Wallet' }))

    await waitFor(() => {
      expect(screen.getByText('Withdraw failed')).toBeInTheDocument()
    })
  })

  it('disables withdraw button when escrow balance is zero', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" escrowBalance={0n} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeDisabled()
    })
  })

  it('shows take control step after withdraw for verified channel', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useWalletClient).mockReturnValue({
      data: { account: { address: '0xuser' } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(withdrawFromEscrow).mockResolvedValue({ hash: '0xwithdraw' })

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Withdraw to Wallet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Take Control' })).toBeInTheDocument()
    })
  })

  it('calls takeChannelControl when clicking take control button', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useWalletClient).mockReturnValue({
      data: { account: { address: '0xuser' } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(withdrawFromEscrow).mockResolvedValue({ hash: '0xwithdraw' })
    vi.mocked(takeChannelControl).mockResolvedValue({ hash: '0xtakecontrol' })

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Withdraw to Wallet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Take Control' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Take Control' }))

    await waitFor(() => {
      expect(takeChannelControl).toHaveBeenCalled()
    })
  })

  it('shows take control error when takeChannelControl fails', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useWalletClient).mockReturnValue({
      data: { account: { address: '0xuser' } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(withdrawFromEscrow).mockResolvedValue({ hash: '0xwithdraw' })
    vi.mocked(takeChannelControl).mockRejectedValue(new Error('Take control failed'))

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Withdraw to Wallet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Take Control' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Take Control' }))

    await waitFor(() => {
      expect(screen.getByText('Take control failed')).toBeInTheDocument()
    })
  })

  it('shows "All Done!" completion step after take control', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useWalletClient).mockReturnValue({
      data: { account: { address: '0xuser' } },
    } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(withdrawFromEscrow).mockResolvedValue({ hash: '0xwithdraw' })
    vi.mocked(takeChannelControl).mockResolvedValue({ hash: '0xtakecontrol' })

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Withdraw to Wallet' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Withdraw to Wallet' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Take Control' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Take Control' }))

    await waitFor(() => {
      expect(screen.getByText('All Done!')).toBeInTheDocument()
    })
  })

  it('calls onClose when clicking Cancel button', async () => {
    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} />)

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('shows "Done" button after verification completes', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
    })
  })

  it('does not show withdraw step for creator-controlled channel', () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    render(<ClaimFlowModal {...defaultProps} channelState="creator-controlled" />)

    expect(screen.getByText('Verify your identity')).toBeInTheDocument()
  })

  it('shows stepper with correct steps', () => {
    render(<ClaimFlowModal {...defaultProps} />)

    expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
    expect(screen.getByText('Verify Identity')).toBeInTheDocument()
    expect(screen.getByText('Withdraw Funds')).toBeInTheDocument()
    expect(screen.getByText('Take Control')).toBeInTheDocument()
  })

  it('resets state when modal is reopened', async () => {
    const { rerender } = render(<ClaimFlowModal {...defaultProps} open={false} />)

    rerender(<ClaimFlowModal {...defaultProps} open={true} />)

    expect(screen.getByText('Connect your wallet')).toBeInTheDocument()
  })

  it('calls onSuccess after successful verification', async () => {
    const onSuccess = vi.fn()
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" onSuccess={onSuccess} />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
    })
  })

  it('shows verification transaction hash after successful verification', async () => {
    setupChallengeMocks({ confirmVerificationResult: { txHash: '0xtxhash' } })
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)

    const user = userEvent.setup()
    render(<ClaimFlowModal {...defaultProps} channelState="verified" />)

    await user.click(screen.getByRole('button', { name: 'Get Verification Tweet' }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText('https://x.com/username/status/...')).toBeInTheDocument()
    })

    await user.type(screen.getByPlaceholderText('https://x.com/username/status/...'), 'https://x.com/user/status/123')
    await user.click(screen.getByRole('button', { name: 'I Tweeted It' }))

    await waitFor(() => {
      expect(screen.getByText(/0xtxhash/)).toBeInTheDocument()
    })
  })
})
