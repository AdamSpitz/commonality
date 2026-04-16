import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SettingsPage } from './SettingsPage'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
  useWalletClient: () => ({ data: undefined }),
  usePublicClient: () => undefined,
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    getUserSocialData: vi.fn().mockResolvedValue({
      address: '0x1234567890abcdef1234567890abcdef12345678',
      isTwitterVerified: false,
      socialDataFetched: true,
    }),
  }
})

vi.mock('../../content-funding/hooks/useClaimFlow', () => ({
  useClaimFlow: vi.fn(() => ({
    getChallenge: vi.fn(),
    confirmVerification: vi.fn(),
    loading: false,
    error: null,
    clearError: vi.fn(),
  })),
}))

vi.mock('../../shared/hooks/useMachinery', () => ({
  useMachinery: vi.fn(() => MOCK_MACHINERY),
}))

import { useAccount } from 'wagmi'
import { getUserSocialData } from '@commonality/sdk'
import { useClaimFlow } from '../../content-funding/hooks/useClaimFlow'

const TRUSTED_ATTESTERS_KEY = 'commonality:trustedAttesters'
const TWITTER_HANDLE_HINTS_KEY = 'commonality:twitterHandleHints'
const VALID_ADDRESS_1 = '0x1234567890abcdef1234567890abcdef12345678'
const VALID_ADDRESS_2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
const VALID_ADDRESS_MIXED_CASE = '0xABCDEF1234567890abcdef1234567890ABCDEF12'
const MOCK_MACHINERY = {}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.mocked(useAccount).mockReturnValue({ address: undefined, isConnected: false } as any)
    vi.mocked(getUserSocialData).mockResolvedValue({
      address: VALID_ADDRESS_1,
      isTwitterVerified: false,
      socialDataFetched: true,
    } as any)
    vi.mocked(useClaimFlow).mockReturnValue({
      getChallenge: vi.fn(),
      confirmVerification: vi.fn(),
      loading: false,
      error: null,
      clearError: vi.fn(),
    } as any)
  })

  describe('Initial rendering', () => {
    it('displays "Trust Settings" heading', () => {
      render(<SettingsPage />)

      expect(screen.getByRole('heading', { name: /trust settings/i })).toBeInTheDocument()
    })

    it('displays "Trusted implication attesters" section heading', () => {
      render(<SettingsPage />)

      expect(screen.getByText('Trusted implication attesters')).toBeInTheDocument()
    })

    it('explains that the page is advanced', () => {
      render(<SettingsPage />)

      expect(screen.getByText(/most new users can ignore this page at first/i)).toBeInTheDocument()
    })

    it('displays description text about implication attesters', () => {
      render(<SettingsPage />)

      expect(screen.getByText(/implication attesters evaluate whether believing one statement/i)).toBeInTheDocument()
    })

    it('displays info alert about the official attester not being deployed', () => {
      render(<SettingsPage />)

      expect(screen.getByText(/the official commonality implication attester ai is not yet deployed/i)).toBeInTheDocument()
    })

    it('displays the address input field', () => {
      render(<SettingsPage />)

      expect(screen.getByLabelText(/attester address/i)).toBeInTheDocument()
    })

    it('displays the Add button', () => {
      render(<SettingsPage />)

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })
  })

  describe('Twitter linking', () => {
    it('prompts the user to connect a wallet before linking Twitter', () => {
      render(<SettingsPage />)

      expect(screen.getByText(/connect your wallet to link your twitter/i)).toBeInTheDocument()
    })

    it('loads a saved Twitter handle hint for the connected wallet', async () => {
      localStorage.setItem(TWITTER_HANDLE_HINTS_KEY, JSON.stringify({
        [VALID_ADDRESS_1.toLowerCase()]: '@alice',
      }))
      vi.mocked(useAccount).mockReturnValue({ address: VALID_ADDRESS_1, isConnected: true } as any)

      render(<SettingsPage />)

      expect(await screen.findByDisplayValue('@alice')).toBeInTheDocument()
    })

    it('requests a verification challenge and confirms the Twitter link', async () => {
      const user = userEvent.setup()
      const getChallenge = vi.fn().mockResolvedValue({
        nonce: 'nonce-123',
        verificationPostTemplate: 'Claiming my funded content #commonality-nonce-123',
      })
      const confirmVerification = vi.fn().mockResolvedValue({ txHash: '0xtx', observedPostId: '1' })

      vi.mocked(useAccount).mockReturnValue({ address: VALID_ADDRESS_1, isConnected: true } as any)
      vi.mocked(useClaimFlow).mockReturnValue({
        getChallenge,
        confirmVerification,
        loading: false,
        error: null,
        clearError: vi.fn(),
      } as any)
      vi.mocked(getUserSocialData)
        .mockResolvedValueOnce({
          address: VALID_ADDRESS_1,
          twitterHandle: '@alice',
          isTwitterVerified: true,
          twitterAssociationSource: 'channel-registry',
          socialDataFetched: true,
        } as any)

      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/twitter \/ x handle/i), '@alice')
      await user.click(screen.getByRole('button', { name: /get verification tweet/i }))

      expect(getChallenge).toHaveBeenCalledWith('twitter', '@alice', VALID_ADDRESS_1)
      expect(await screen.findByDisplayValue(/claiming my funded content/i)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /i tweeted it/i }))

      await waitFor(() => {
        expect(confirmVerification).toHaveBeenCalledWith('nonce-123')
      })
      expect(await screen.findByText(/linked via channel registry as @alice/i)).toBeInTheDocument()

      const storedHints = JSON.parse(localStorage.getItem(TWITTER_HANDLE_HINTS_KEY)!)
      expect(storedHints[VALID_ADDRESS_1.toLowerCase()]).toBe('@alice')
    })
  })

  describe('Empty state', () => {
    it('displays empty state message when no attesters configured', () => {
      render(<SettingsPage />)

      expect(screen.getByText(/no trusted attesters configured/i)).toBeInTheDocument()
    })

    it('shows "0 trusted attesters configured" count', () => {
      render(<SettingsPage />)

      expect(screen.getByText('0 trusted attesters configured')).toBeInTheDocument()
    })
  })

  describe('Loading from localStorage', () => {
    it('loads trusted attesters from localStorage on mount', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))

      render(<SettingsPage />)

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()
    })

    it('loads multiple attesters from localStorage', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1, VALID_ADDRESS_2]))

      render(<SettingsPage />)

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()
      expect(screen.getByText(VALID_ADDRESS_2)).toBeInTheDocument()
    })

    it('filters out invalid addresses from localStorage', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1, 'not-an-address', VALID_ADDRESS_2]))

      render(<SettingsPage />)

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()
      expect(screen.getByText(VALID_ADDRESS_2)).toBeInTheDocument()
      expect(screen.queryByText('not-an-address')).not.toBeInTheDocument()
    })

    it('handles corrupted JSON in localStorage gracefully', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, '{not valid json')

      render(<SettingsPage />)

      expect(screen.getByText(/no trusted attesters configured/i)).toBeInTheDocument()
    })

    it('handles non-array JSON in localStorage gracefully', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify({ key: 'value' }))

      render(<SettingsPage />)

      expect(screen.getByText(/no trusted attesters configured/i)).toBeInTheDocument()
    })
  })

  describe('Adding an attester', () => {
    it('adds a valid address and displays it in the list', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()
    })

    it('clears the input field after adding', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      const input = screen.getByLabelText(/attester address/i)
      await user.type(input, VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(input).toHaveValue('')
    })

    it('displays success message after adding', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/attester added successfully/i)).toBeInTheDocument()
    })

    it('persists the added attester to localStorage', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      const stored = JSON.parse(localStorage.getItem(TRUSTED_ATTESTERS_KEY)!)
      expect(stored).toContain(VALID_ADDRESS_1)
    })

    it('updates the attester count after adding', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText('1 trusted attester configured')).toBeInTheDocument()
    })

    it('removes empty state message after adding first attester', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      expect(screen.getByText(/no trusted attesters configured/i)).toBeInTheDocument()

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.queryByText(/no trusted attesters configured/i)).not.toBeInTheDocument()
    })

    it('supports adding via Enter key', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      const input = screen.getByLabelText(/attester address/i)
      await user.type(input, VALID_ADDRESS_1)
      await user.keyboard('{Enter}')

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()
    })
  })

  describe('Validation errors', () => {
    it('shows error when trying to add empty address', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/please enter an address/i)).toBeInTheDocument()
    })

    it('shows error for invalid address format', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), 'not-valid')
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/invalid ethereum address format/i)).toBeInTheDocument()
    })

    it('shows error for address that is too short', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), '0x1234')
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/invalid ethereum address format/i)).toBeInTheDocument()
    })

    it('shows error for duplicate address (case-insensitive)', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1.toUpperCase().replace('0X', '0x'))
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/already in your trusted list/i)).toBeInTheDocument()
    })

    it('clears error when adding a valid address after an error', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      // Trigger error
      await user.click(screen.getByRole('button', { name: /add/i }))
      expect(screen.getByText(/please enter an address/i)).toBeInTheDocument()

      // Add valid address
      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.queryByText(/please enter an address/i)).not.toBeInTheDocument()
    })

    it('allows dismissing error alert via close button', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      // Trigger error
      await user.click(screen.getByRole('button', { name: /add/i }))
      const errorAlert = screen.getByText(/please enter an address/i).closest('[role="alert"]')!
      expect(errorAlert).toBeInTheDocument()

      // Close it
      const closeButton = errorAlert.querySelector('button[aria-label="Close"]') as HTMLElement
      await user.click(closeButton)

      expect(screen.queryByText(/please enter an address/i)).not.toBeInTheDocument()
    })
  })

  describe('Removing an attester', () => {
    it('removes an attester when delete button is clicked', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))
      const user = userEvent.setup()
      render(<SettingsPage />)

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /remove/i }))

      expect(screen.queryByText(VALID_ADDRESS_1)).not.toBeInTheDocument()
    })

    it('displays success message after removing', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: /remove/i }))

      expect(screen.getByText(/attester removed/i)).toBeInTheDocument()
    })

    it('updates localStorage after removing', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1, VALID_ADDRESS_2]))
      const user = userEvent.setup()
      render(<SettingsPage />)

      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[0])

      const stored = JSON.parse(localStorage.getItem(TRUSTED_ATTESTERS_KEY)!)
      expect(stored).toEqual([VALID_ADDRESS_2])
    })

    it('shows empty state after removing the last attester', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.click(screen.getByRole('button', { name: /remove/i }))

      expect(screen.getByText(/no trusted attesters configured/i)).toBeInTheDocument()
    })

    it('updates the attester count after removing', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1, VALID_ADDRESS_2]))
      const user = userEvent.setup()
      render(<SettingsPage />)

      expect(screen.getByText('2 trusted attesters configured')).toBeInTheDocument()

      const removeButtons = screen.getAllByRole('button', { name: /remove/i })
      await user.click(removeButtons[0])

      expect(screen.getByText('1 trusted attester configured')).toBeInTheDocument()
    })
  })

  describe('Success message dismissal', () => {
    it('allows dismissing success alert via close button', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))

      const successAlert = screen.getByText(/attester added successfully/i).closest('[role="alert"]')!
      const closeButton = successAlert.querySelector('button[aria-label="Close"]') as HTMLElement
      await user.click(closeButton)

      expect(screen.queryByText(/attester added successfully/i)).not.toBeInTheDocument()
    })

    it('clears previous success message when performing another action', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      // Add first attester
      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_1)
      await user.click(screen.getByRole('button', { name: /add/i }))
      expect(screen.getByText(/attester added successfully/i)).toBeInTheDocument()

      // Trigger an error - should clear success message
      await user.click(screen.getByRole('button', { name: /add/i }))
      expect(screen.queryByText(/attester added successfully/i)).not.toBeInTheDocument()
    })
  })

  describe('Attester count pluralization', () => {
    it('shows singular "attester" for count of 1', async () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))

      render(<SettingsPage />)

      expect(screen.getByText('1 trusted attester configured')).toBeInTheDocument()
    })

    it('shows plural "attesters" for count of 0', () => {
      render(<SettingsPage />)

      expect(screen.getByText('0 trusted attesters configured')).toBeInTheDocument()
    })

    it('shows plural "attesters" for count of 2', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1, VALID_ADDRESS_2]))

      render(<SettingsPage />)

      expect(screen.getByText('2 trusted attesters configured')).toBeInTheDocument()
    })
  })

  describe('Address display', () => {
    it('displays addresses in monospace font', () => {
      localStorage.setItem(TRUSTED_ATTESTERS_KEY, JSON.stringify([VALID_ADDRESS_1]))

      render(<SettingsPage />)

      const addressElement = screen.getByText(VALID_ADDRESS_1)
      expect(addressElement).toHaveStyle({ fontFamily: 'monospace' })
    })
  })

  describe('Whitespace handling', () => {
    it('trims whitespace from input before validating', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), `  ${VALID_ADDRESS_1}  `)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(VALID_ADDRESS_1)).toBeInTheDocument()
    })

    it('treats whitespace-only input as empty', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), '   ')
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(/please enter an address/i)).toBeInTheDocument()
    })
  })

  describe('Mixed case address handling', () => {
    it('preserves original case when adding an address', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByLabelText(/attester address/i), VALID_ADDRESS_MIXED_CASE)
      await user.click(screen.getByRole('button', { name: /add/i }))

      expect(screen.getByText(VALID_ADDRESS_MIXED_CASE)).toBeInTheDocument()
    })
  })
})
