import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConnectWalletPrompt } from './ConnectWalletPrompt'

describe('ConnectWalletPrompt', () => {
  it('renders a Paper with connect wallet message', () => {
    render(<ConnectWalletPrompt />)
    expect(screen.getByText('Connect your wallet to buy tokens.')).toBeInTheDocument()
  })
})
