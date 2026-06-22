import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConnectWalletPrompt } from './ConnectWalletPrompt'

vi.mock('connectkit', () => ({
  ConnectKitButton: () => <button type="button">Connect Wallet</button>,
}))

vi.mock('../../wagmi', () => ({
  isPrivyEnabled: false,
}))

describe('ConnectWalletPrompt', () => {
  it('renders a Paper with connect wallet message', () => {
    render(<ConnectWalletPrompt />)
    expect(screen.getByText('Connect your wallet to give to this project.')).toBeInTheDocument()
  })

  it('renders message inside a Paper component', () => {
    const { container } = render(<ConnectWalletPrompt />)
    const paper = container.querySelector('.MuiPaper-root')
    expect(paper).toBeInTheDocument()
    expect(paper).toHaveTextContent('Connect your wallet to give to this project.')
  })

  it('renders message with body1 typography variant', () => {
    render(<ConnectWalletPrompt />)
    const message = screen.getByText('Connect your wallet to give to this project.')
    expect(message).toHaveClass('MuiTypography-body1')
  })

  it('applies padding and margin-bottom styles to Paper', () => {
    const { container } = render(<ConnectWalletPrompt />)
    const paper = container.querySelector('.MuiPaper-root')
    expect(paper).toHaveStyle({ marginBottom: '24px' })
  })

  it('renders a wallet connect button', () => {
    render(<ConnectWalletPrompt />)
    expect(screen.getByRole('button')).toBeInTheDocument()
  })
})
