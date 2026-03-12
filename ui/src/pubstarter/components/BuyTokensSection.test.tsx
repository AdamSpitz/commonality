import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BuyTokensSection } from './BuyTokensSection'

const USER_ADDR = '0x1111111111111111111111111111111111111111'
const PROJECT_ADDR = '0xaaaa000000000000000000000000000000000001'
const ERC1155_ADDR = '0xbbbb000000000000000000000000000000000002'
const CONTRACT_ADDR = '0x3333333333333333333333333333333333333333'
const ETH_ZERO = '0x0000000000000000000000000000000000000000'

vi.mock('wagmi', () => ({
  useWalletClient: vi.fn(),
  usePublicClient: vi.fn(),
}))

vi.mock('@commonality/sdk', async () => {
  const actual = await vi.importActual('@commonality/sdk')
  return {
    ...actual,
    createSDKMachinery: vi.fn(),
    buyProjectTokens: vi.fn(),
    getNotesByOwner: vi.fn(),
    getDelegationChain: vi.fn(),
    purchaseFromPrimaryMarketWithNotes: vi.fn(),
  }
})

import { useWalletClient, usePublicClient } from 'wagmi'
import {
  createSDKMachinery,
  buyProjectTokens,
  getNotesByOwner,
  getDelegationChain,
  purchaseFromPrimaryMarketWithNotes,
} from '@commonality/sdk'

const mockMachinery = {} as any

function makeProject(overrides: Record<string, any> = {}) {
  return {
    id: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    recipient: '0xcccc000000000000000000000000000000000003',
    threshold: '1000000000000000000',
    deadline: String(Math.floor(Date.now() / 1000) + 86400),
    totalReceived: '500000000000000000',
    metadataCid: 'bafytest123',
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeToken(overrides: Record<string, any> = {}) {
  return {
    projectAddress: PROJECT_ADDR,
    erc1155Address: ERC1155_ADDR,
    tokenId: '1',
    price: '100000000000000000', // 0.1 ETH
    createdAt: '1700000000',
    ...overrides,
  }
}

function makeNote(overrides: Record<string, any> = {}) {
  return {
    id: '42',
    chainHash: '0xabc',
    amount: '500000000000000000', // 0.5 ETH
    token: ETH_ZERO,
    tokenType: 0,
    tokenId: '0',
    owner: USER_ADDR,
    rootOwner: USER_ADDR,
    active: true,
    createdAt: '1700000000',
    createdAtBlock: '100',
    updatedAt: '1700000000',
    ...overrides,
  }
}

describe('BuyTokensSection', () => {
  const onProjectRefresh = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createSDKMachinery).mockReturnValue(mockMachinery)
    vi.mocked(useWalletClient).mockReturnValue({ data: {} } as any)
    vi.mocked(usePublicClient).mockReturnValue({} as any)
    vi.mocked(buyProjectTokens).mockResolvedValue(undefined as any)
    vi.mocked(getNotesByOwner).mockResolvedValue([])
    vi.mocked(getDelegationChain).mockResolvedValue([])
    vi.mocked(purchaseFromPrimaryMarketWithNotes).mockResolvedValue(undefined as any)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function renderSection(overrides: {
    project?: any
    tokens?: any[]
    address?: string | undefined
  } = {}) {
    const props = {
      project: overrides.project ?? makeProject(),
      tokens: overrides.tokens ?? [makeToken()],
      address: overrides.address ?? USER_ADDR,
      onProjectRefresh,
    }
    return render(<BuyTokensSection {...props} />)
  }

  /** Toggle the "Fund with delegatable note" switch. Requires env to be stubbed. */
  async function enableNoteMode(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('switch'))
  }

  /** Wait for notes to load and the Select to appear. */
  async function waitForNoteSelect() {
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })
  }

  /** Select a note from the MUI Select dropdown. Waits for notes to load first. */
  async function selectNote(user: ReturnType<typeof userEvent.setup>) {
    await waitForNoteSelect()
    // MUI Select: click to open the listbox, then click the option
    await user.click(screen.getByRole('combobox'))
    const listbox = await screen.findByRole('listbox')
    const options = within(listbox).getAllByRole('option')
    await user.click(options[0])
  }

  // --- Token images ---

  describe('Token images', () => {
    it('renders token image when tokenImages prop is provided', () => {
      const tokens = [makeToken({ tokenId: '1' })]
      const tokenImages = { '1': 'ipfs://bafyimage123' }
      render(
        <BuyTokensSection
          project={makeProject()}
          tokens={tokens}
          address={USER_ADDR}
          onProjectRefresh={onProjectRefresh}
          tokenImages={tokenImages}
        />
      )
      const img = screen.getByAltText('Token #1')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'ipfs://bafyimage123')
    })

    it('does not render image when tokenImages is not provided', () => {
      renderSection()
      expect(screen.queryByRole('img')).not.toBeInTheDocument()
    })

    it('renders images for multiple tokens', () => {
      const tokens = [makeToken({ tokenId: '1' }), makeToken({ tokenId: '2' })]
      const tokenImages = {
        '1': 'ipfs://bafyimage1',
        '2': 'ipfs://bafyimage2',
      }
      render(
        <BuyTokensSection
          project={makeProject()}
          tokens={tokens}
          address={USER_ADDR}
          onProjectRefresh={onProjectRefresh}
          tokenImages={tokenImages}
        />
      )
      expect(screen.getByAltText('Token #1')).toHaveAttribute('src', 'ipfs://bafyimage1')
      expect(screen.getByAltText('Token #2')).toHaveAttribute('src', 'ipfs://bafyimage2')
    })
  })

  // --- Direct purchase mode ---

  describe('Direct ETH purchase mode', () => {
    it('renders "Buy Tokens" heading', () => {
      renderSection()
      expect(screen.getByText('Buy Tokens')).toBeInTheDocument()
    })

    it('renders quantity input for each token', () => {
      const tokens = [makeToken({ tokenId: '1' }), makeToken({ tokenId: '2' })]
      renderSection({ tokens })

      expect(screen.getByText('Token #1')).toBeInTheDocument()
      expect(screen.getByText('Token #2')).toBeInTheDocument()
      expect(screen.getAllByLabelText('Quantity')).toHaveLength(2)
    })

    it('shows price per token', () => {
      renderSection()
      expect(screen.getByText('0.1 ETH each')).toBeInTheDocument()
    })

    it('shows Buy button', () => {
      renderSection()
      expect(screen.getByRole('button', { name: 'Buy' })).toBeInTheDocument()
    })

    it('shows error when buying with no quantity', async () => {
      const user = userEvent.setup()
      renderSection()

      await user.click(screen.getByRole('button', { name: 'Buy' }))

      expect(screen.getByText('Please enter a quantity for at least one token')).toBeInTheDocument()
      expect(buyProjectTokens).not.toHaveBeenCalled()
    })

    it('calls buyProjectTokens with correct parameters', async () => {
      const user = userEvent.setup()
      renderSection()

      await user.type(screen.getByLabelText('Quantity'), '3')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(buyProjectTokens).toHaveBeenCalledWith(
          expect.objectContaining({ account: USER_ADDR }),
          expect.objectContaining({ address: PROJECT_ADDR }),
          expect.objectContaining({
            buyer: USER_ADDR,
            tokenAddress: ERC1155_ADDR,
            tokenIds: [1n],
            tokenCounts: [3n],
            totalCost: 300000000000000000n,
          }),
        )
      })
    })

    it('shows success message after purchase', async () => {
      const user = userEvent.setup()
      renderSection()

      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Tokens purchased successfully!')).toBeInTheDocument()
      })
    })

    it('calls onProjectRefresh after purchase', async () => {
      const user = userEvent.setup()
      renderSection()

      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(onProjectRefresh).toHaveBeenCalled()
      })
    })

    it('clears quantities after successful purchase', async () => {
      const user = userEvent.setup()
      renderSection()

      const input = screen.getByLabelText('Quantity')
      await user.type(input, '2')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(input).toHaveValue(null)
      })
    })

    it('shows error message when purchase fails', async () => {
      vi.mocked(buyProjectTokens).mockRejectedValue(new Error('Tx reverted'))
      const user = userEvent.setup()
      renderSection()

      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy' }))

      await waitFor(() => {
        expect(screen.getByText('Tx reverted')).toBeInTheDocument()
      })
    })
  })

  // --- Delegatable note toggle visibility ---

  describe('Delegatable note toggle', () => {
    it('shows toggle when contract env is set', () => {
      vi.stubEnv('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS', CONTRACT_ADDR)
      renderSection()
      expect(screen.getByText('Fund with delegatable note')).toBeInTheDocument()
    })
  })

  // --- Note mode ---

  describe('Note purchase mode', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_DELEGATABLE_NOTES_CONTRACT_ADDRESS', CONTRACT_ADDR)
    })

    it('shows loading spinner while fetching notes', async () => {
      vi.mocked(getNotesByOwner).mockImplementation(
        () => new Promise(() => {}), // never resolves
      )
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      expect(screen.getByText('Loading your notes…')).toBeInTheDocument()
    })

    it('shows info alert when user has no ETH notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getByText(/no active ETH delegatable notes/)).toBeInTheDocument()
      })
    })

    it('filters out non-ETH notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([
        makeNote({ id: '1', token: '0x000000000000000000000000000000000000dead' }),
      ])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getByText(/no active ETH delegatable notes/)).toBeInTheDocument()
      })
    })

    it('filters out inactive notes', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([
        makeNote({ id: '1', active: false }),
      ])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getByText(/no active ETH delegatable notes/)).toBeInTheDocument()
      })
    })

    it('renders note dropdown when notes exist', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitForNoteSelect()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('shows "Buy with Note" button', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Buy with Note' })).toBeInTheDocument()
      })
    })

    it('"Buy with Note" button is disabled when no note selected', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Buy with Note' })).toBeDisabled()
      })
    })

    it('shows token quantity inputs in note mode', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      const user = userEvent.setup()
      renderSection({ tokens: [makeToken({ tokenId: '1' }), makeToken({ tokenId: '2' })] })
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getAllByLabelText('Quantity')).toHaveLength(2)
      })
    })

    it('shows total cost when quantity entered', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '2')

      await waitFor(() => {
        expect(screen.getByText(/Total cost: 0\.2 ETH/)).toBeInTheDocument()
      })
    })

    it('shows insufficient balance warning when cost exceeds note', async () => {
      const smallNote = makeNote({ amount: '50000000000000000' }) // 0.05 ETH
      vi.mocked(getNotesByOwner).mockResolvedValue([smallNote])
      const user = userEvent.setup()
      renderSection() // token costs 0.1 ETH each
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '1')

      await waitFor(() => {
        expect(screen.getByText(/Exceeds note balance/)).toBeInTheDocument()
      })
    })

    it('"Buy with Note" button disabled when balance insufficient', async () => {
      const smallNote = makeNote({ amount: '50000000000000000' }) // 0.05 ETH
      vi.mocked(getNotesByOwner).mockResolvedValue([smallNote])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '1')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Buy with Note' })).toBeDisabled()
      })
    })

    it('calls purchaseFromPrimaryMarketWithNotes with correct params', async () => {
      const note = makeNote({ id: '42', amount: '500000000000000000' })
      vi.mocked(getNotesByOwner).mockResolvedValue([note])
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: '0xroot', position: 0, createdAt: '100' },
        { address: USER_ADDR, position: 1, createdAt: '200' },
      ])

      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '2')
      await user.click(screen.getByRole('button', { name: 'Buy with Note' }))

      await waitFor(() => {
        expect(purchaseFromPrimaryMarketWithNotes).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({ address: CONTRACT_ADDR }),
          expect.objectContaining({
            noteIds: [42n],
            chains: [[USER_ADDR, '0xroot']], // sorted by position desc
            paymentAmount: 200000000000000000n,
            primaryMarket: PROJECT_ADDR,
            erc1155Contract: ERC1155_ADDR,
            tokenIds: [1n],
            counts: [2n],
          }),
        )
      })
    })

    it('shows success message after note purchase', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: USER_ADDR, position: 0, createdAt: '100' },
      ])

      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy with Note' }))

      await waitFor(() => {
        expect(screen.getByText('Tokens purchased successfully via delegatable note!')).toBeInTheDocument()
      })
    })

    it('shows error when note purchase fails', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: USER_ADDR, position: 0, createdAt: '100' },
      ])
      vi.mocked(purchaseFromPrimaryMarketWithNotes).mockRejectedValue(
        new Error('Insufficient funds'),
      )

      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy with Note' }))

      await waitFor(() => {
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
      })
    })

    it('calls onProjectRefresh after note purchase', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      vi.mocked(getDelegationChain).mockResolvedValue([
        { address: USER_ADDR, position: 0, createdAt: '100' },
      ])

      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)
      await selectNote(user)

      await user.type(screen.getByLabelText('Quantity'), '1')
      await user.click(screen.getByRole('button', { name: 'Buy with Note' }))

      await waitFor(() => {
        expect(onProjectRefresh).toHaveBeenCalled()
      })
    })

    it('"Buy with Note" button disabled when no quantity entered', async () => {
      vi.mocked(getNotesByOwner).mockResolvedValue([makeNote()])
      const user = userEvent.setup()
      renderSection()
      await enableNoteMode(user)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Buy with Note' })).toBeDisabled()
      })
    })
  })
})
