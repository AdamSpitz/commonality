import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { WebsiteClaimSection } from './WebsiteClaimSection'

const mockAccount = {
  address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
  isConnected: true,
}

vi.mock('wagmi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('wagmi')>()
  return {
    ...actual,
    useAccount: () => mockAccount,
    usePublicClient: () => ({
      readContract: vi.fn().mockResolvedValue(0n),
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
  }
})

vi.mock('../../content-funding', async () => ({
  ClaimFlowModal: () => null,
}))

describe('WebsiteClaimSection', () => {
  beforeEach(() => {
    mockAccount.isConnected = true
  })

  it('invites the website controller to claim later', () => {
    render(<WebsiteClaimSection domain="example.org" />)
    expect(screen.getByText('Claim this website')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /claim example.org/i })).toBeInTheDocument()
    expect(screen.getByText(/well-known\/commonality-claim.json/)).toBeInTheDocument()
    expect(screen.getByText(/_commonality.example.org/)).toBeInTheDocument()
  })
})
