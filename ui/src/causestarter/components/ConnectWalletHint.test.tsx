import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ConnectWalletHint } from './ConnectWalletHint'

vi.mock('./WalletButton', () => ({
  WalletButton: () => <button type="button">Connect</button>,
}))

describe('ConnectWalletHint', () => {
  it('puts the message and connect action on one info row', () => {
    render(<ConnectWalletHint>Connect a wallet to publicly sign this statement.</ConnectWalletHint>)
    const hint = screen.getByTestId('connect-wallet-hint')
    expect(hint).toHaveTextContent(/connect a wallet to publicly sign/i)
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument()
  })
})
