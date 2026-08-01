import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AddressPicker } from './AddressPicker'
import { addContact, clearContacts } from '../stores/contactStore'

vi.mock('wagmi', () => ({
  usePublicClient: vi.fn(),
}))

import { usePublicClient } from 'wagmi'

const SELF = '0x1111111111111111111111111111111111111111'
const OTHER = '0x2222222222222222222222222222222222222222'
const PROJECT = '0x3333333333333333333333333333333333333333'

describe('AddressPicker', () => {
  let onChange: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    onChange = vi.fn()
    vi.mocked(usePublicClient).mockReturnValue({ getEnsAddress: vi.fn() } as any)
    await clearContacts()
  })

  function renderPicker(props: Partial<React.ComponentProps<typeof AddressPicker>> = {}) {
    return render(
      <AddressPicker
        legend="Delegate to"
        address={SELF}
        contactKind="delegate"
        onChange={onChange}
        {...props}
      />,
    )
  }

  it('omits the self option when no label for it is given', () => {
    renderPicker()

    expect(screen.queryByRole('radio', { name: /my account/i })).not.toBeInTheDocument()
  })

  it('offers the self option when a label for it is given', () => {
    renderPicker({ selfOptionLabel: 'Send to my account' })

    expect(screen.getByRole('radio', { name: /send to my account/i })).toBeInTheDocument()
  })

  it('reports "empty" rather than "invalid" before anything is typed', async () => {
    renderPicker()

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null, 'empty'))
  })

  it('reports "invalid" for input that is neither an address nor a name', async () => {
    renderPicker()

    fireEvent.click(screen.getByRole('radio', { name: /enter an ethereum address/i }))
    fireEvent.change(await screen.findByPlaceholderText('0x... or name.eth'), {
      target: { value: 'not-an-address' },
    })

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(null, 'invalid'))
  })

  it('accepts a literal address without waiting for ENS', async () => {
    renderPicker()

    fireEvent.click(screen.getByRole('radio', { name: /enter an ethereum address/i }))
    fireEvent.change(await screen.findByPlaceholderText('0x... or name.eth'), {
      target: { value: OTHER },
    })

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(OTHER, 'valid'))
  })

  it('only offers contacts saved under its own kind', async () => {
    await addContact(OTHER, 'Dana', 'delegate')
    await addContact(PROJECT, 'Roof fund', 'project')

    renderPicker()

    fireEvent.click(screen.getByRole('radio', { name: /pick from a saved contact/i }))
    fireEvent.mouseDown(await screen.findByRole('combobox'))

    expect(await screen.findByText('Dana')).toBeInTheDocument()
    expect(screen.queryByText('Roof fund')).not.toBeInTheDocument()
  })

  it('lands on the contact list when there are contacts and no self option', async () => {
    await addContact(OTHER, 'Dana', 'delegate')

    renderPicker()

    await waitFor(() => {
      expect((screen.getByRole('radio', { name: /pick from a saved contact/i }) as HTMLInputElement).checked).toBe(true)
    })
  })

  it('saves a confirmed address under its own kind', async () => {
    const onConfirm = vi.fn()
    renderPicker({ onConfirm })

    fireEvent.click(screen.getByRole('radio', { name: /enter an ethereum address/i }))
    fireEvent.change(await screen.findByPlaceholderText('0x... or name.eth'), {
      target: { value: OTHER },
    })
    fireEvent.change(screen.getByLabelText(/label \(optional\)/i), { target: { value: 'Dana' } })
    fireEvent.click(await screen.findByRole('button', { name: /use this address/i }))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(OTHER))
    const { getContacts } = await import('../stores/contactStore')
    await waitFor(async () => {
      expect(await getContacts('delegate')).toEqual([
        expect.objectContaining({ address: OTHER, label: 'Dana', kinds: ['delegate'] }),
      ])
    })
  })
})
