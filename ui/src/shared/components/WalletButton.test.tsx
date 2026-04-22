import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivyWalletButton } from './WalletButton'

const mockConnectOrCreateWallet = vi.fn()
const mockLinkWallet = vi.fn()
const mockLogout = vi.fn()
const mockSetActiveWallet = vi.fn()
const mockUsePrivy = vi.fn()
const mockUseWallets = vi.fn()
const mockUseAccount = vi.fn()

vi.mock('@privy-io/react-auth', () => ({
  usePrivy: () => mockUsePrivy(),
  useWallets: () => mockUseWallets(),
}))

vi.mock('@privy-io/wagmi', () => ({
  useSetActiveWallet: () => ({ setActiveWallet: mockSetActiveWallet }),
}))

vi.mock('wagmi', () => ({
  useAccount: () => mockUseAccount(),
}))

vi.mock('connectkit', () => ({
  ConnectKitButton: () => <button type="button">Connect</button>,
}))

vi.mock('../../wagmi', () => ({
  isPrivyEnabled: true,
}))

describe('PrivyWalletButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSetActiveWallet.mockResolvedValue(undefined)
    mockLogout.mockResolvedValue(undefined)
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: false,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [],
      ready: true,
    })
    mockUseAccount.mockReturnValue({
      address: undefined,
    })
  })

  it('shows a sign-in button before authentication', async () => {
    const user = userEvent.setup()
    render(<PrivyWalletButton />)

    await user.click(screen.getByRole('button', { name: /sign in \/ wallet/i }))

    expect(mockConnectOrCreateWallet).toHaveBeenCalledTimes(1)
  })

  it('shows a loading button while Privy is still initializing', () => {
    mockUsePrivy.mockReturnValue({
      ready: false,
      authenticated: false,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })

    render(<PrivyWalletButton />)

    expect(screen.getByRole('button', { name: /^wallet$/i })).toBeDisabled()
  })

  it('syncs the embedded wallet into wagmi when authenticated without an active address', async () => {
    const embeddedWallet = {
      address: '0x1234567890123456789012345678901234567890',
      walletClientType: 'privy',
    }
    const externalWallet = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      walletClientType: 'wallet_connect',
    }

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [externalWallet, embeddedWallet],
      ready: true,
    })

    render(<PrivyWalletButton />)

    await waitFor(() => {
      expect(mockSetActiveWallet).toHaveBeenCalledWith(embeddedWallet)
    })
  })

  it('shows the connected address menu and supports logout', async () => {
    const user = userEvent.setup()
    const address = '0x1234567890123456789012345678901234567890'

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [{ address, walletClientType: 'privy' }],
      ready: true,
    })
    mockUseAccount.mockReturnValue({
      address,
    })

    render(<PrivyWalletButton />)

    await user.click(screen.getByRole('button', { name: /0x1234\.\.\.7890/i }))
    await user.click(screen.getByRole('menuitem', { name: /log out/i }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })
})
