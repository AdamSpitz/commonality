import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OrganizerIdentity } from './OrganizerIdentity'

vi.mock('@ui/shared', () => ({
  AddressDisplay: ({ address }: { address: string }) => <span data-testid="address-display">{address}</span>,
}))

afterEach(cleanup)

describe('OrganizerIdentity', () => {
  const address = '0x1111111111111111111111111111111111111111'

  it('renders the address widget without a contact pointer', () => {
    render(<OrganizerIdentity address={address} />)
    expect(screen.getByTestId('address-display')).toHaveTextContent(address)
    expect(screen.queryByTestId('organizer-contact-url')).toBeNull()
  })

  it('links a published https pointer', () => {
    render(<OrganizerIdentity address={address} contactUrl="https://example.com/me" />)
    const link = screen.getByTestId('organizer-contact-url')
    expect(link).toHaveAttribute('href', 'https://example.com/me')
  })

  it('drops javascript URLs', () => {
    render(<OrganizerIdentity address={address} contactUrl="javascript:alert(1)" />)
    expect(screen.queryByTestId('organizer-contact-url')).toBeNull()
  })
})
