import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountName } from './AccountName'

const address = '0x1234567890abcdef1234567890abcdef12345678'
const suggestion = {
  attester: address,
  accountBeingNamed: address,
  name: 'Ada Lovelace',
  blockNumber: 1n,
  logIndex: 0,
}

const { getSuggestedDisplayName, machinery } = vi.hoisted(() => ({
  getSuggestedDisplayName: vi.fn(),
  machinery: { suggestedNames: '0x0000000000000000000000000000000000000001' },
}))

vi.mock('../accountNames/loadSuggestedDisplayName', () => ({
  getSuggestedDisplayName,
}))

vi.mock('../hooks/useMachinery', () => ({
  useMachinery: () => machinery,
}))

describe('AccountName', () => {
  beforeEach(() => {
    localStorage.clear()
    getSuggestedDisplayName.mockReset()
    getSuggestedDisplayName.mockResolvedValue(null)
  })

  it('shows the fallback label when there is no suggestion', async () => {
    render(<AccountName address={address} label="alice.eth" detail="alice.eth" />)
    expect(await screen.findByText('alice.eth')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
  })

  it('accepts one suggestion in place and keeps the previous name on the tooltip', async () => {
    getSuggestedDisplayName.mockResolvedValue(suggestion)
    const user = userEvent.setup()
    render(<AccountName address={address} label="alice.eth" detail="alice.eth" />)

    expect(await screen.findByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByLabelText('About this suggested name')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Accept' }))

    const accepted = screen.getByText('Ada Lovelace')
    expect(accepted).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(accepted.getAttribute('title')).toContain('alice.eth')
    expect(accepted.getAttribute('title')).toContain(address)
  })
})
