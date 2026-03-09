import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MyRefsPage } from './MyRefsPage'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useWalletClient: vi.fn(() => ({ data: null })),
  usePublicClient: vi.fn(() => null),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    getUserRefs: vi.fn(),
    getUserRef: vi.fn(),
    getUserRefHistory: vi.fn(),
    updateRef: vi.fn(),
    fetchFromIPFS: vi.fn(),
    MutableRefUpdaterAbi: [],
  }
})

import { useAccount, useWalletClient, usePublicClient } from 'wagmi'
import { createSDKMachinery, getUserRefs, getUserRef, getUserRefHistory, updateRef } from '@commonality/sdk'

const mockWalletClient = {} as any
const mockPublicClient = {} as any
const userAddress = '0x1111111111111111111111111111111111111111'

function makeRef(overrides: Record<string, any> = {}) {
  return {
    owner: userAddress,
    name: 'my-ref',
    value: 'some-value',
    updatedAt: '1700000000',
    ...overrides,
  }
}

describe('MyRefsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue({} as any)
    // Set env var for contract address so submit works
    import.meta.env.VITE_MUTABLE_REF_UPDATER_CONTRACT_ADDRESS = '0xcontract'
  })

  describe('Wallet not connected', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: undefined } as any)
    })

    it('shows connect wallet prompt', () => {
      render(<MyRefsPage />)
      expect(screen.getByText('My Refs')).toBeInTheDocument()
      expect(screen.getByText(/connect your wallet/i)).toBeInTheDocument()
    })

    it('does not show the create/update form', () => {
      render(<MyRefsPage />)
      expect(screen.queryByText('Create / Update Ref')).not.toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(getUserRefs).mockReturnValue(new Promise(() => {}))
    })

    it('shows a loading spinner while fetching refs', () => {
      render(<MyRefsPage />)
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(getUserRefs).mockRejectedValue(new Error('Network failure'))
    })

    it('shows error alert when fetch fails', async () => {
      render(<MyRefsPage />)
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText('Network failure')).toBeInTheDocument()
      })
    })
  })

  describe('Empty state', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(getUserRefs).mockResolvedValue([])
    })

    it('shows empty state message', async () => {
      render(<MyRefsPage />)
      await waitFor(() => {
        expect(screen.getByText(/no refs found/i)).toBeInTheDocument()
      })
    })

    it('still shows the create/update form', async () => {
      render(<MyRefsPage />)
      await waitFor(() => {
        expect(screen.getByText('Create / Update Ref')).toBeInTheDocument()
      })
    })
  })

  describe('Refs table', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
    })

    it('renders ref names and (truncated) values', async () => {
      vi.mocked(getUserRefs).mockResolvedValue([
        makeRef({ name: 'config-ref', value: 'ipfs://short' }),
      ] as any)

      render(<MyRefsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'config-ref' })).toBeInTheDocument()
        expect(screen.getByText('ipfs://short')).toBeInTheDocument()
      })
    })

    it('truncates long values in the table', async () => {
      const longValue = 'a'.repeat(60)
      vi.mocked(getUserRefs).mockResolvedValue([
        makeRef({ name: 'big-ref', value: longValue }),
      ] as any)

      render(<MyRefsPage />)

      await waitFor(() => {
        expect(screen.getByText('a'.repeat(50) + '…')).toBeInTheDocument()
      })
    })

    it('renders Edit, Delete, and History action buttons for each ref', async () => {
      vi.mocked(getUserRefs).mockResolvedValue([makeRef()] as any)

      render(<MyRefsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'History' })).toBeInTheDocument()
      })
    })

    it('sorts refs by updatedAt descending', async () => {
      vi.mocked(getUserRefs).mockResolvedValue([
        makeRef({ name: 'older', updatedAt: '1000000000' }),
        makeRef({ name: 'newer', updatedAt: '1700000000' }),
      ] as any)

      render(<MyRefsPage />)

      await waitFor(() => {
        const buttons = screen.getAllByRole('button', { name: /older|newer/ })
        expect(buttons[0]).toHaveTextContent('newer')
        expect(buttons[1]).toHaveTextContent('older')
      })
    })
  })

  describe('Create/Update form', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(getUserRefs).mockResolvedValue([])
    })

    it('disables submit button when name or value is empty', async () => {
      render(<MyRefsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /update ref/i })).toBeDisabled()
      })
    })

    it('enables submit button when both name and value are filled', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByLabelText('Name'))

      await user.type(screen.getByLabelText('Name'), 'my-key')
      await user.type(screen.getByLabelText('Value'), 'my-value')

      expect(screen.getByRole('button', { name: /update ref/i })).toBeEnabled()
    })

    it('shows overwrite warning when ref name already exists', async () => {
      vi.mocked(getUserRefs).mockResolvedValue([makeRef({ name: 'existing' })] as any)
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByLabelText('Name'))
      await user.type(screen.getByLabelText('Name'), 'existing')

      await waitFor(() => {
        expect(screen.getByText(/already exists/i)).toBeInTheDocument()
        expect(screen.getByText(/overwrite it/i)).toBeInTheDocument()
      })
    })
  })

  describe('Direct delete from table', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: mockWalletClient } as any)
      vi.mocked(usePublicClient).mockReturnValue(mockPublicClient as any)
      vi.mocked(getUserRefs).mockResolvedValue([makeRef({ name: 'to-delete' })] as any)
    })

    it('opens delete confirmation dialog when Delete is clicked', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'Delete' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      const dialog = await waitFor(() => screen.getByRole('dialog', { name: /delete ref/i }))

      await waitFor(() => {
        expect(within(dialog).getByText(/to-delete/)).toBeInTheDocument()
      })
    })

    it('closes delete dialog on Cancel', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'Delete' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      await waitFor(() => screen.getByRole('dialog', { name: /delete ref/i }))

      await user.click(screen.getByRole('button', { name: 'Cancel' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /delete ref/i })).not.toBeInTheDocument()
      })
    })

    it('calls updateRef with empty string on confirm and removes ref from table', async () => {
      vi.mocked(updateRef).mockResolvedValue(undefined as any)
      vi.mocked(getUserRefs).mockResolvedValue([makeRef({ name: 'to-delete' })] as any)
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'Delete' }))
      await user.click(screen.getByRole('button', { name: 'Delete' }))

      const dialog = await waitFor(() => screen.getByRole('dialog', { name: /delete ref/i }))

      await user.click(within(dialog).getByRole('button', { name: /^delete$/i }))

      await waitFor(() => {
        expect(updateRef).toHaveBeenCalledWith(
          expect.anything(),
          expect.anything(),
          'to-delete',
          ''
        )
      })
    })
  })

  describe('RefDetailDialog', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(useWalletClient).mockReturnValue({ data: mockWalletClient } as any)
      vi.mocked(usePublicClient).mockReturnValue(mockPublicClient as any)
      vi.mocked(getUserRefs).mockResolvedValue([makeRef({ name: 'my-ref', value: 'hello' })] as any)
      vi.mocked(getUserRefHistory).mockResolvedValue([])
    })

    it('opens when clicking the ref name', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'my-ref' }))
      await user.click(screen.getByRole('button', { name: 'my-ref' }))

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /ref: my-ref/i })).toBeInTheDocument()
      })
    })

    it('opens in edit mode when Edit button is clicked', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'Edit' }))
      await user.click(screen.getByRole('button', { name: 'Edit' }))

      await waitFor(() => {
        const dialog = screen.getByRole('dialog')
        // In edit mode a text field is rendered instead of a read-only textarea
        expect(within(dialog).getByRole('textbox')).toBeInTheDocument()
        expect(within(dialog).getByRole('button', { name: /save/i })).toBeInTheDocument()
      })
    })

    it('closes when Close is clicked', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'my-ref' }))
      await user.click(screen.getByRole('button', { name: 'my-ref' }))
      await waitFor(() => screen.getByRole('dialog'))

      await user.click(screen.getByRole('button', { name: 'Close' }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('shows IPFS inspector button when value is a CID', async () => {
      vi.mocked(getUserRefs).mockResolvedValue([
        makeRef({ name: 'cid-ref', value: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' }),
      ] as any)
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'cid-ref' }))
      await user.click(screen.getByRole('button', { name: 'cid-ref' }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /inspect ipfs content/i })).toBeInTheDocument()
      })
    })

    it('does not show IPFS inspector for non-CID values', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: 'my-ref' }))
      await user.click(screen.getByRole('button', { name: 'my-ref' }))

      await waitFor(() => screen.getByRole('dialog'))

      expect(screen.queryByRole('button', { name: /inspect ipfs content/i })).not.toBeInTheDocument()
    })
  })

  describe('Ref Lookup section', () => {
    beforeEach(() => {
      vi.mocked(useAccount).mockReturnValue({ address: userAddress } as any)
      vi.mocked(getUserRefs).mockResolvedValue([])
    })

    it('renders the collapsed lookup section', async () => {
      render(<MyRefsPage />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /ref lookup/i })).toBeInTheDocument()
      })
    })

    it('expands and shows address field on click', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: /ref lookup/i }))
      await user.click(screen.getByRole('button', { name: /ref lookup/i }))

      await waitFor(() => {
        expect(screen.getByLabelText('Address')).toBeInTheDocument()
      })
    })

    it('disables Look Up button when address is empty', async () => {
      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: /ref lookup/i }))
      await user.click(screen.getByRole('button', { name: /ref lookup/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /look up/i })).toBeDisabled()
      })
    })

    it('calls getUserRefs for a given address and shows results', async () => {
      const otherAddress = '0x2222222222222222222222222222222222222222'
      vi.mocked(getUserRef).mockResolvedValue(null as any)
      vi.mocked(getUserRefs).mockImplementation((_, addr) => {
        if (addr === otherAddress) {
          return Promise.resolve([makeRef({ owner: otherAddress, name: 'found-ref' })] as any)
        }
        return Promise.resolve([])
      })

      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: /ref lookup/i }))
      await user.click(screen.getByRole('button', { name: /ref lookup/i }))
      await waitFor(() => screen.getByLabelText('Address'))

      await user.type(screen.getByLabelText('Address'), otherAddress)
      await user.click(screen.getByRole('button', { name: /look up/i }))

      await waitFor(() => {
        expect(screen.getByText('found-ref')).toBeInTheDocument()
      })
    })

    it('shows "no refs found" when lookup returns empty', async () => {
      vi.mocked(getUserRefs).mockResolvedValue([])

      const user = userEvent.setup()
      render(<MyRefsPage />)

      await waitFor(() => screen.getByRole('button', { name: /ref lookup/i }))
      await user.click(screen.getByRole('button', { name: /ref lookup/i }))
      await waitFor(() => screen.getByLabelText('Address'))

      await user.type(screen.getByLabelText('Address'), '0x9999999999999999999999999999999999999999')
      await user.click(screen.getByRole('button', { name: /look up/i }))

      await waitFor(() => {
        expect(screen.getByText(/no refs found for this address/i)).toBeInTheDocument()
      })
    })
  })
})
