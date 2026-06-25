import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DirectTrustSettingsSection } from './DirectTrustSettingsSection'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(() => ({ data: null })),
  usePublicClient: vi.fn(() => null),
}))

vi.mock('@commonality/sdk/indexer-sync', async () => {
  const actual = await vi.importActual('@commonality/sdk/indexer-sync')
  return {
    ...actual,
    waitForIndexerToSyncToTxHash: vi.fn(),
  }
})

vi.mock('@commonality/sdk/machinery', async () => {
  const actual = await vi.importActual('@commonality/sdk/machinery')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
  }
})

vi.mock('@commonality/sdk/subjectiv', async () => {
  const actual = await vi.importActual('@commonality/sdk/subjectiv')
  return {
    ...actual,
    getDirectTrustMapping: vi.fn(),
    setTrust: vi.fn(),
  }
})

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(),
}))

vi.mock('../../shared/hooks/useTrustedSet', () => ({
  useTrustedSet: vi.fn(),
}))

vi.mock('../../shared/subjectivTrust', () => ({
  notifySubjectivTrustNetworkInvalidated: vi.fn(),
}))

import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { waitForIndexerToSyncToTxHash } from '@commonality/sdk/indexer-sync'
import { createSDKMachinery } from '@commonality/sdk/machinery'
import { getDirectTrustMapping, setTrust } from '@commonality/sdk/subjectiv'
import { useMachinery } from '../../shared'
import { useTrustedSet } from '../../shared'
import { notifySubjectivTrustNetworkInvalidated } from '../../shared'

const USER_ADDR = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const TRUSTEE_A = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const TRUSTEE_B = '0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC'

describe('DirectTrustSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue({} as any)
    vi.mocked(waitForIndexerToSyncToTxHash).mockResolvedValue(undefined)
    vi.mocked(useMachinery).mockReturnValue({} as any)
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false })
    vi.mocked(useWalletClient).mockReturnValue({ data: null })
    vi.mocked(usePublicClient).mockReturnValue(null)
    vi.mocked(useTrustedSet).mockReturnValue({
      trustedSet: null,
      isLoading: false,
      error: null,
      refreshTrustedSet: vi.fn(),
    })
    vi.stubEnv('VITE_TRUST_REGISTRY_CONTRACT_ADDRESS', '0xTrustRegistry123')
  })

  describe('Wallet not connected', () => {
    it('shows info alert to connect wallet', () => {
      render(<DirectTrustSettingsSection />)
      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    })

    it('does not show the trust management form', () => {
      render(<DirectTrustSettingsSection />)
      expect(screen.queryByLabelText('Wallet Address')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(getDirectTrustMapping).mockReturnValue(new Promise(() => {}))
    })

    it('shows spinner while loading direct trust mappings', () => {
      render(<DirectTrustSettingsSection />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(getDirectTrustMapping).mockRejectedValue(new Error('Network failure'))
    })

    it('shows error alert when fetch fails', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Network failure')
      })
    })
  })

  describe('Empty state', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())
    })

    it('shows empty state message', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText(/no direct trust scores yet/i)).toBeInTheDocument()
      })
    })

    it('shows the add trust form', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByLabelText('Wallet Address')).toBeInTheDocument()
        expect(screen.getByLabelText('Score')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })
    })

    it('shows "Refresh Network" button', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refresh Network' })).toBeInTheDocument()
      })
    })

    it('shows zero count caption', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText('0 direct trust scores configured')).toBeInTheDocument()
      })
    })
  })

  describe('Trust entries list', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      const trustMap = new Map()
      trustMap.set(TRUSTEE_A, 80)
      trustMap.set(TRUSTEE_B, 50)
      vi.mocked(getDirectTrustMapping).mockResolvedValue(trustMap)
    })

    it('renders trust entries sorted by score descending', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        const items = screen.getAllByRole('listitem')
        expect(items[0]).toHaveTextContent(TRUSTEE_A)
        expect(items[0]).toHaveTextContent('80')
        expect(items[1]).toHaveTextContent(TRUSTEE_B)
        expect(items[1]).toHaveTextContent('50')
      })
    })

    it('shows score chips for each entry', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText('80')).toBeInTheDocument()
        expect(screen.getByText('50')).toBeInTheDocument()
      })
    })

    it('shows delete button for each entry', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button', { name: /remove/i })
        expect(deleteButtons).toHaveLength(2)
      })
    })

    it('shows count caption with plural', async () => {
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText('2 direct trust scores configured')).toBeInTheDocument()
      })
    })

    it('shows network size when trustedSet is available', async () => {
      vi.mocked(useTrustedSet).mockReturnValue({
        trustedSet: new Set([TRUSTEE_A, TRUSTEE_B, '0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD']),
        isLoading: false,
        error: null,
        refreshTrustedSet: vi.fn(),
      })
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText('Current network size: 3 accounts')).toBeInTheDocument()
      })
    })

    it('shows singular caption for single entry', async () => {
      const singleMap = new Map()
      singleMap.set(TRUSTEE_A, 75)
      vi.mocked(getDirectTrustMapping).mockResolvedValue(singleMap)
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText('1 direct trust score configured')).toBeInTheDocument()
      })
    })
  })

  describe('Adding trust', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(useWalletClient).mockReturnValue({ data: {} })
      vi.mocked(usePublicClient).mockReturnValue({})
      vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())
      vi.mocked(setTrust).mockResolvedValue(undefined)
    })

    it('shows error for invalid wallet address', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), 'not-an-address')
      await user.type(screen.getByLabelText('Score'), '{selectall}75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText(/valid wallet address/i)).toBeInTheDocument()
      })
    })

    it('shows error for score out of range', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '0')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText(/trust score must be an integer/i)).toBeInTheDocument()
      })
    })

    it('shows error for non-integer score', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '50.5')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText(/trust score must be an integer/i)).toBeInTheDocument()
      })
    })

    it('shows error when wallet not connected on submit', async () => {
      vi.mocked(useWalletClient).mockReturnValue({ data: null })
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText(/wallet not connected/i)).toBeInTheDocument()
      })
    })

    it('calls setTrust with correct parameters on successful save', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(setTrust).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ address: '0xTrustRegistry123' }),
          TRUSTEE_A.toLowerCase(),
          75
        )
      })
    })

    it('shows success message after saving', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Direct trust updated')).toBeInTheDocument()
      })
    })

    it('clears form fields after successful save', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByLabelText('Wallet Address')).toHaveValue('')
        expect(screen.getByLabelText('Score')).toHaveValue(100)
      })
    })

    it('notifies trust network invalidated after save', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(notifySubjectivTrustNetworkInvalidated).toHaveBeenCalled()
      })
    })

    it('refreshes the entries list after save', async () => {
      const trustMap = new Map()
      trustMap.set(TRUSTEE_A.toLowerCase(), 75)
      vi.mocked(setTrust).mockImplementation(async () => {
        vi.mocked(getDirectTrustMapping).mockResolvedValue(trustMap)
      })
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText(TRUSTEE_A.toLowerCase())).toBeInTheDocument()
      })
    })

    it('shows error when setTrust fails', async () => {
      vi.mocked(setTrust).mockRejectedValue(new Error('Transaction reverted'))
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A)
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '75')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(screen.getByText('Transaction reverted')).toBeInTheDocument()
      })
    })

    it('normalizes address to lowercase before saving', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByLabelText('Wallet Address'))

      await user.type(screen.getByLabelText('Wallet Address'), TRUSTEE_A.toUpperCase())
      const scoreInput = screen.getByLabelText('Score')
      await user.clear(scoreInput)
      await user.type(scoreInput, '50')
      await user.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(setTrust).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          TRUSTEE_A.toLowerCase(),
          50
        )
      })
    })
  })

  describe('Removing trust', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(useWalletClient).mockReturnValue({ data: {} })
      vi.mocked(usePublicClient).mockReturnValue({})
      const trustMap = new Map()
      trustMap.set(TRUSTEE_A, 80)
      vi.mocked(getDirectTrustMapping).mockResolvedValue(trustMap)
      vi.mocked(setTrust).mockResolvedValue(undefined)
    })

    it('calls setTrust with score 0 when delete is clicked', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await user.click(screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await waitFor(() => {
        expect(setTrust).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({ address: '0xTrustRegistry123' }),
          TRUSTEE_A,
          0
        )
      })
    })

    it('shows success message after removing trust', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await user.click(screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await waitFor(() => {
        expect(screen.getByText('Direct trust removed')).toBeInTheDocument()
      })
    })

    it('notifies trust network invalidated after removal', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await user.click(screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await waitFor(() => {
        expect(notifySubjectivTrustNetworkInvalidated).toHaveBeenCalled()
      })
    })

    it('shows error when remove fails', async () => {
      vi.mocked(setTrust).mockRejectedValue(new Error('Revert'))
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await user.click(screen.getByRole('button', { name: `remove ${TRUSTEE_A}` }))

      await waitFor(() => {
        expect(screen.getByText('Revert')).toBeInTheDocument()
      })
    })
  })

  describe('Refresh Network button', () => {
    const mockRefresh = vi.fn()

    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())
      vi.mocked(useTrustedSet).mockReturnValue({
        trustedSet: null,
        isLoading: false,
        error: null,
        refreshTrustedSet: mockRefresh,
      })
    })

    it('calls refreshTrustedSet when clicked', async () => {
      const user = userEvent.setup()
      render(<DirectTrustSettingsSection />)
      await waitFor(() => screen.getByRole('button', { name: 'Refresh Network' }))

      await user.click(screen.getByRole('button', { name: 'Refresh Network' }))
      expect(mockRefresh).toHaveBeenCalled()
    })

    it('is disabled while trustedSet is loading', async () => {
      vi.mocked(useTrustedSet).mockReturnValue({
        trustedSet: null,
        isLoading: true,
        error: null,
        refreshTrustedSet: mockRefresh,
      })
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Refresh Network' })).toBeDisabled()
      })
    })
  })

  describe('TrustedSet loading status', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())
    })

    it('shows refreshing message with network size when trustedSet is available', async () => {
      vi.mocked(useTrustedSet).mockReturnValue({
        trustedSet: new Set([TRUSTEE_A, TRUSTEE_B]),
        isLoading: true,
        error: null,
        refreshTrustedSet: vi.fn(),
      })
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText(/refreshing your trust network.*2 accounts/i)).toBeInTheDocument()
      })
    })

    it('shows refreshing message without network size when trustedSet is null', async () => {
      vi.mocked(useTrustedSet).mockReturnValue({
        trustedSet: null,
        isLoading: true,
        error: null,
        refreshTrustedSet: vi.fn(),
      })
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        expect(screen.getByText(/refreshing your trust network/i)).toBeInTheDocument()
      })
    })
  })

  describe('TrustedSet error display', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: USER_ADDR, isConnected: true })
      vi.mocked(getDirectTrustMapping).mockResolvedValue(new Map())
    })

    it('shows warning alert when trustedSet has an error', async () => {
      vi.mocked(useTrustedSet).mockReturnValue({
        trustedSet: null,
        isLoading: false,
        error: 'Worker computation failed',
        refreshTrustedSet: vi.fn(),
      })
      render(<DirectTrustSettingsSection />)
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        const warningAlert = alerts.find(a => a.textContent?.includes('Worker computation failed'))
        expect(warningAlert).toBeInTheDocument()
      })
    })
  })
})
