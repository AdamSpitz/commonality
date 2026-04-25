import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import PrivyWalletButtonImpl from './PrivyWalletButtonImpl'

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
    render(<PrivyWalletButtonImpl />)

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

    render(<PrivyWalletButtonImpl />)

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

    render(<PrivyWalletButtonImpl />)

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

    render(<PrivyWalletButtonImpl />)

    await user.click(screen.getByRole('button', { name: /0x1234\.\.\.7890/i }))
    await user.click(screen.getByRole('menuitem', { name: /log out/i }))

    expect(mockLogout).toHaveBeenCalledTimes(1)
  })

  it('shows "Create Wallet" button when authenticated but no wallet address available', async () => {
    const user = userEvent.setup()
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
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

    render(<PrivyWalletButtonImpl />)

    const createButton = screen.getByRole('button', { name: /create wallet/i })
    expect(createButton).toBeInTheDocument()
    await user.click(createButton)
    expect(mockConnectOrCreateWallet).toHaveBeenCalledTimes(1)
  })

  it('calls linkWallet when "Link Another Wallet" menu item is clicked', async () => {
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

    render(<PrivyWalletButtonImpl />)

    await user.click(screen.getByRole('button', { name: /0x1234\.\.\.7890/i }))
    await user.click(screen.getByRole('menuitem', { name: /link another wallet/i }))

    expect(mockLinkWallet).toHaveBeenCalledTimes(1)
  })

  it('shows truncated address from wallets when wagmi address is undefined', () => {
    const address = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

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
      address: undefined,
    })

    render(<PrivyWalletButtonImpl />)

    expect(screen.getByRole('button', { name: /0xabcd\.\.\.abcd/i })).toBeInTheDocument()
  })

  it('prefers wagmi address over wallet address when both available', () => {
    const wagmiAddress = '0x1111111111111111111111111111111111111111'
    const walletAddress = '0x2222222222222222222222222222222222222222'

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [{ address: walletAddress, walletClientType: 'privy' }],
      ready: true,
    })
    mockUseAccount.mockReturnValue({
      address: wagmiAddress,
    })

    render(<PrivyWalletButtonImpl />)

    expect(screen.getByRole('button', { name: /0x1111\.\.\.1111/i })).toBeInTheDocument()
  })

  it('shows loading state when authenticated but wallets not ready', () => {
    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [],
      ready: false,
    })
    mockUseAccount.mockReturnValue({
      address: undefined,
    })

    render(<PrivyWalletButtonImpl />)

    expect(screen.getByRole('button', { name: /^wallet$/i })).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  it('closes menu after clicking a menu item', async () => {
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

    render(<PrivyWalletButtonImpl />)

    await user.click(screen.getByRole('button', { name: /0x1234\.\.\.7890/i }))
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument()

    await user.click(screen.getByRole('menuitem', { name: /log out/i }))

    await waitFor(() => {
      expect(screen.queryByRole('menuitem', { name: /log out/i })).not.toBeInTheDocument()
    })
  })

  it('displays full address in disabled menu item', async () => {
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

    render(<PrivyWalletButtonImpl />)

    await user.click(screen.getByRole('button', { name: /0x1234\.\.\.7890/i }))

    expect(screen.getByText(address)).toBeInTheDocument()
  })

  it('handles setActiveWallet failure gracefully', async () => {
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockSetActiveWallet.mockRejectedValue(new Error('wallet sync failed'))

    const embeddedWallet = {
      address: '0x1234567890123456789012345678901234567890',
      walletClientType: 'privy',
    }

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [embeddedWallet],
      ready: true,
    })
    mockUseAccount.mockReturnValue({
      address: undefined,
    })

    render(<PrivyWalletButtonImpl />)

    await waitFor(() => {
      expect(mockSetActiveWallet).toHaveBeenCalledWith(embeddedWallet)
    })

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to set active Privy wallet for wagmi',
        expect.any(Error)
      )
    })

    consoleWarnSpy.mockRestore()
  })

  it('prefers embedded wallet over external wallet when setting active wallet', async () => {
    const embeddedWallet = {
      address: '0x1234567890123456789012345678901234567890',
      walletClientType: 'privy',
    }
    const externalWallet = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      walletClientType: 'metamask',
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
    mockUseAccount.mockReturnValue({
      address: undefined,
    })

    render(<PrivyWalletButtonImpl />)

    await waitFor(() => {
      expect(mockSetActiveWallet).toHaveBeenCalledWith(embeddedWallet)
    })
  })

  it('uses first wallet when no embedded wallet available', async () => {
    const externalWallet = {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      walletClientType: 'metamask',
    }

    mockUsePrivy.mockReturnValue({
      ready: true,
      authenticated: true,
      connectOrCreateWallet: mockConnectOrCreateWallet,
      linkWallet: mockLinkWallet,
      logout: mockLogout,
    })
    mockUseWallets.mockReturnValue({
      wallets: [externalWallet],
      ready: true,
    })
    mockUseAccount.mockReturnValue({
      address: undefined,
    })

    render(<PrivyWalletButtonImpl />)

    await waitFor(() => {
      expect(mockSetActiveWallet).toHaveBeenCalledWith(externalWallet)
    })
  })
})
