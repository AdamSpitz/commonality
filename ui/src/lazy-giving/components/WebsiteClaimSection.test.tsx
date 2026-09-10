import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { WebsiteClaimSection } from './WebsiteClaimSection'

const mockAccount = {
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  isConnected: true,
}

const readContract = vi.fn()

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>()
  return {
    ...actual,
    useAccount: () => mockAccount,
    usePublicClient: () => ({
      readContract,
    }),
  }
})

vi.mock('../../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../shared')>()
  return {
    ...actual,
    getRuntimeConfigValue: (key: string) => {
      if (key === 'VITE_BENEFICIARY_REGISTRY_ADDRESS') return '0x2222222222222222222222222222222222222222'
      if (key === 'VITE_BENEFICIARY_ESCROW_ADDRESS') return '0x3333333333333333333333333333333333333333'
      return undefined
    },
    useWriteClients: () => ({ walletClient: {}, publicClient: {} }),
    humanizeTxError: (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback),
  }
})

vi.mock('@commonality/sdk/content-funding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@commonality/sdk/content-funding')>()
  return {
    ...actual,
    rotatePayoutAddress: vi.fn().mockResolvedValue({ hash: '0xrotate' }),
  }
})

vi.mock('../../content-funding', async () => ({
  ClaimFlowModal: () => null,
}))

describe('WebsiteClaimSection', () => {
  beforeEach(() => {
    mockAccount.isConnected = true
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'beneficiaryState') return 0n
      if (functionName === 'balance') return 0n
      if (functionName === 'payoutAddress') return '0x0000000000000000000000000000000000000000'
      if (functionName === 'claimWithdrawableAt') return 0n
      return 0n
    })
  })

  it('invites the website controller to claim later', () => {
    render(<WebsiteClaimSection domain="example.org" />)
    expect(screen.getByText('Claim this website')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /claim example.org/i })).toBeInTheDocument()
    expect(screen.getByText(/well-known\/commonality-claim.json/)).toBeInTheDocument()
    expect(screen.getByText(/_commonality.example.org/)).toBeInTheDocument()
  })

  it('lets the current payout wallet rotate the address', async () => {
    const { rotatePayoutAddress } = await import('@commonality/sdk/content-funding')
    readContract.mockImplementation(async ({ functionName }: { functionName: string }) => {
      if (functionName === 'beneficiaryState') return 1n
      if (functionName === 'balance') return 0n
      if (functionName === 'payoutAddress') return mockAccount.address
      if (functionName === 'claimWithdrawableAt') return 0n
      return 0n
    })

    render(<WebsiteClaimSection domain="example.org" />)
    expect(await screen.findByText(/Current payout wallet/)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/new payout address/i), '0x4444444444444444444444444444444444444444')
    await userEvent.click(screen.getByRole('button', { name: /update payout address/i }))
    await waitFor(() => {
      expect(rotatePayoutAddress).toHaveBeenCalled()
    })
  })
})
