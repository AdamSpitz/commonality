import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useChainId: vi.fn(),
  useSwitchChain: vi.fn(),
}))

import { useAccount, useChainId, useSwitchChain } from 'wagmi'
import { hardhat, mainnet } from 'wagmi/chains'
import { NetworkSwitchPrompt } from './NetworkSwitchPrompt'

describe('NetworkSwitchPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAccount).mockReturnValue({ isConnected: true } as any)
    vi.mocked(useChainId).mockReturnValue(hardhat.id)
    vi.mocked(useSwitchChain).mockReturnValue({ switchChain: vi.fn(), isPending: false } as any)
  })

  it('renders nothing when the wallet is disconnected', () => {
    vi.mocked(useAccount).mockReturnValue({ isConnected: false } as any)
    vi.mocked(useChainId).mockReturnValue(mainnet.id)

    const { container } = render(<NetworkSwitchPrompt />)

    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when on the expected chain', () => {
    const { container } = render(<NetworkSwitchPrompt />)

    expect(container.firstChild).toBeNull()
  })

  it('prompts a switch when on the wrong chain', () => {
    vi.mocked(useChainId).mockReturnValue(mainnet.id)

    render(<NetworkSwitchPrompt />)

    expect(screen.getByText(/wrong network/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch network/i })).toBeInTheDocument()
  })

  it('requests a switch to the expected chain when clicked', async () => {
    const switchChain = vi.fn()
    vi.mocked(useChainId).mockReturnValue(mainnet.id)
    vi.mocked(useSwitchChain).mockReturnValue({ switchChain, isPending: false } as any)

    const user = userEvent.setup()
    render(<NetworkSwitchPrompt />)

    await user.click(screen.getByRole('button', { name: /switch network/i }))

    expect(switchChain).toHaveBeenCalledWith({ chainId: hardhat.id })
  })

  it('shows a pending state while switching', () => {
    vi.mocked(useChainId).mockReturnValue(mainnet.id)
    vi.mocked(useSwitchChain).mockReturnValue({ switchChain: vi.fn(), isPending: true } as any)

    render(<NetworkSwitchPrompt />)

    const button = screen.getByRole('button', { name: /switching/i })
    expect(button).toBeDisabled()
  })
})
