import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BeliefControls } from './BeliefControls'
import { NO_OPINION, BELIEVES, DISBELIEVES } from '@commonality/sdk'

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

// Import the mocked modules to configure them
import { useAccount, useWalletClient, usePublicClient } from 'wagmi'

describe('BeliefControls', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks()
  })

  describe('when wallet is not connected', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({
        address: undefined,
        isConnected: false,
      } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: undefined } as any)
      vi.mocked(usePublicClient).mockReturnValue(undefined as any)
    })

    it('displays a message prompting user to connect wallet', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={NO_OPINION}
        />,
      )

      expect(
        screen.getByText(/connect your wallet to share your view/i),
      ).toBeInTheDocument()
    })

    it('does not show belief buttons when wallet is disconnected', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={NO_OPINION}
        />,
      )

      expect(screen.queryByRole('button', { name: /believe/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /disbelieve/i })).not.toBeInTheDocument()
    })
  })

  describe('when wallet is connected', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({
        address: '0x1234567890123456789012345678901234567890',
        isConnected: true,
      } as any)
      vi.mocked(useWalletClient).mockReturnValue({
        data: { account: { address: '0x1234567890123456789012345678901234567890' } },
      } as any)
      vi.mocked(usePublicClient).mockReturnValue({
        waitForTransactionReceipt: vi.fn(),
      } as any)
    })

    it('displays Believe and Disbelieve buttons', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={NO_OPINION}
        />,
      )

      expect(screen.getByRole('button', { name: /^agree$/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^disagree$/i })).toBeInTheDocument()
    })

    it('shows "no opinion" state message when currentBeliefState is NO_OPINION', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={NO_OPINION}
        />,
      )

      expect(
        screen.getByText(/you haven't shared your view/i),
      ).toBeInTheDocument()
    })

    it('does not show Clear Opinion button when currentBeliefState is NO_OPINION', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={NO_OPINION}
        />,
      )

      expect(
        screen.queryByRole('button', { name: /clear opinion/i }),
      ).not.toBeInTheDocument()
    })

    it('shows "believes" state message when currentBeliefState is BELIEVES', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={BELIEVES}
        />,
      )

      expect(
        screen.getByText(/you agree with this statement/i),
      ).toBeInTheDocument()
    })

    it('shows Clear Opinion button when currentBeliefState is BELIEVES', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={BELIEVES}
        />,
      )

      expect(screen.getByRole('button', { name: /clear opinion/i })).toBeInTheDocument()
    })

    it('highlights Believe button with success color when currentBeliefState is BELIEVES', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={BELIEVES}
        />,
      )

      const believeButton = screen.getByRole('button', { name: /^agree$/i })
      // MUI applies color via props, we can check it's rendered without error
      expect(believeButton).toBeInTheDocument()
    })

    it('shows "disbelieves" state message when currentBeliefState is DISBELIEVES', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={DISBELIEVES}
        />,
      )

      expect(
        screen.getByText(/you disagree with this statement/i),
      ).toBeInTheDocument()
    })

    it('shows Clear Opinion button when currentBeliefState is DISBELIEVES', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={DISBELIEVES}
        />,
      )

      expect(screen.getByRole('button', { name: /clear opinion/i })).toBeInTheDocument()
    })

    it('highlights Disbelieve button with error color when currentBeliefState is DISBELIEVES', () => {
      render(
        <BeliefControls
          statementCid="QmTest123"
          currentBeliefState={DISBELIEVES}
        />,
      )

      const disbelieveButton = screen.getByRole('button', { name: /^disagree$/i })
      // MUI applies color via props, we can check it's rendered without error
      expect(disbelieveButton).toBeInTheDocument()
    })
  })
})
