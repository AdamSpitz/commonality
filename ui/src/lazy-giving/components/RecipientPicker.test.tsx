import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecipientPicker } from './RecipientPicker'
// Deep import + namespace import kept on purpose: vi.spyOn needs the real
// module namespace object, and vi.mock must target the real module path (the
// barrel live-re-exports from this same module, so production callers routed
// through the barrel still get intercepted).
// eslint-disable-next-line no-restricted-imports
import * as contactStore from '../../shared/stores/contactStore'

// Mock the contact store
vi.mock('../../shared/stores/contactStore', () => ({
  getContacts: vi.fn(),
  addContact: vi.fn().mockResolvedValue(undefined),
  removeContact: vi.fn(),
  touchContact: vi.fn(),
  clearContacts: vi.fn(),
}))

// Mock wagmi hooks
const mockAccountAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
const mockGetEnsAddress = vi.fn()

// Stable mock client reference so it doesn't change on every render
const mockPublicClient = { getEnsAddress: mockGetEnsAddress }

vi.mock('wagmi', () => ({
  useAccount: () => ({
    address: mockAccountAddress,
    isConnected: true,
  }),
  usePublicClient: () => mockPublicClient,
}))

describe('RecipientPicker', () => {
  const onChange = vi.fn()
  const onConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(contactStore.getContacts).mockResolvedValue([])
  })

  it('renders three radio options', () => {
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    expect(screen.getByLabelText(/send to my account/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/pick from a saved contact/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/enter an ethereum address/i)).toBeInTheDocument()
  })

  it('defaults to "send to my account" and calls onChange with connected address', () => {
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const defaultRadio = screen.getByLabelText(/send to my account/i) as HTMLInputElement
    expect(defaultRadio.checked).toBe(true)
    expect(onChange).toHaveBeenCalledWith(mockAccountAddress)
  })

  it('calls onChange with null when no address is connected and self is selected', () => {
    render(<RecipientPicker address={undefined} onChange={onChange} />)

    const defaultRadio = screen.getByLabelText(/send to my account/i) as HTMLInputElement
    expect(defaultRadio.checked).toBe(true)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('shows the truncated connected address alongside "send to my account"', () => {
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    // The truncated address appears in the radio label and possibly the summary
    const matches = screen.getAllByText(/0xf39F/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
  })

  it('shows empty contact state when switching to contact mode with no contacts', async () => {
    vi.mocked(contactStore.getContacts).mockResolvedValue([])

    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const contactRadio = screen.getByLabelText(/pick from a saved contact/i)
    await user.click(contactRadio)

    await waitFor(() => {
      expect(screen.getByText(/no saved contacts yet/i)).toBeInTheDocument()
    })
  })

  it('shows contact select dropdown when contacts exist', async () => {
    vi.mocked(contactStore.getContacts).mockResolvedValue([
      {
        address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
        label: 'Test Contact',
        addedAt: 1000,
        lastUsedAt: 2000,
      },
    ])

    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const contactRadio = screen.getByLabelText(/pick from a saved contact/i)
    await user.click(contactRadio)

    // The select should show "Select a contact…" placeholder text
    await waitFor(() => {
      expect(screen.getByText(/select a contact/i)).toBeInTheDocument()
    })
  })

  it('shows ENS input and label field when "enter address" is selected', async () => {
    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const manualRadio = screen.getByLabelText(/enter an ethereum address/i)
    await user.click(manualRadio)

    expect(screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/label/i)).toBeInTheDocument()
  })

  it('resolves ENS name after debounce and shows confirmation', async () => {
    const resolvedAddress = '0x1234567890abcdef1234567890abcdef12345678'
    mockGetEnsAddress.mockResolvedValue(resolvedAddress)

    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    // Switch to manual mode
    const manualRadio = screen.getByLabelText(/enter an ethereum address/i)
    await user.click(manualRadio)

    // Type ENS name atomically using input event (triggers React onChange)
    const input = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i) as HTMLInputElement
    fireEvent.input(input, { target: { value: 'test.eth' } })

    // Wait for debounced resolution (600ms debounce)
    await waitFor(
      () => {
        expect(mockGetEnsAddress).toHaveBeenCalledWith({ name: 'test.eth' })
      },
      { timeout: 2000 },
    )

    // Should show confirmation text with the resolved name
    await waitFor(
      () => {
        expect(screen.getByText(/test\.eth/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it('shows error when ENS name cannot be resolved', async () => {
    mockGetEnsAddress.mockResolvedValue(null)

    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const manualRadio = screen.getByLabelText(/enter an ethereum address/i)
    await user.click(manualRadio)

    const input = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i) as HTMLInputElement
    fireEvent.input(input, { target: { value: 'nonexistent.eth' } })

    await waitFor(
      () => {
        expect(screen.getByText(/could not resolve/i)).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it('shows error for input that is neither address nor ENS', async () => {
    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const manualRadio = screen.getByLabelText(/enter an ethereum address/i)
    await user.click(manualRadio)

    const input = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i) as HTMLInputElement
    fireEvent.input(input, { target: { value: 'not-a-valid-input' } })

    await waitFor(() => {
      expect(screen.getByText(/enter a valid ethereum address/i)).toBeInTheDocument()
    })
  })

  it('shows "Use This Address" button for plain address entry', async () => {
    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} />)

    const manualRadio = screen.getByLabelText(/enter an ethereum address/i)
    await user.click(manualRadio)

    const input = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i) as HTMLInputElement
    fireEvent.input(input, { target: { value: '0x1234567890abcdef1234567890abcdef12345678' } })

    await waitFor(() => {
      expect(screen.getByText(/use this address/i)).toBeInTheDocument()
    })
  })

  it('calls onConfirm with resolved address when ENS confirmation button is clicked', async () => {
    const resolvedAddress = '0x1234567890abcdef1234567890abcdef12345678'
    mockGetEnsAddress.mockResolvedValue(resolvedAddress)

    const user = userEvent.setup()
    render(<RecipientPicker address={mockAccountAddress} onChange={onChange} onConfirm={onConfirm} />)

    // Switch to manual mode
    const manualRadio = screen.getByLabelText(/enter an ethereum address/i)
    await user.click(manualRadio)

    // Type ENS name one character at a time via userEvent
    const input = screen.getByPlaceholderText(/0x\.\.\. or name\.eth/i)
    await user.type(input, 'test.eth')

    // Wait for the last debounce timer to fire and ENS resolution to complete
    await waitFor(
      () => {
        expect(mockGetEnsAddress).toHaveBeenCalled()
      },
      { timeout: 3000 },
    )

    // Now wait for the confirm button to appear
    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument()
      },
      { timeout: 2000 },
    )

    await user.click(screen.getByRole('button', { name: /confirm/i }))
    expect(onConfirm).toHaveBeenCalledWith(resolvedAddress)
  })
})
