import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}))

vi.mock('connectkit', () => ({
  ConnectKitButton: () => <button type="button">Connect</button>,
}))

vi.mock('./shared/components/WalletButton', () => ({
  WalletButton: () => <button type="button">Wallet</button>,
}))

const mockUseMediaQuery = vi.fn()
const mockUseTheme = vi.fn()

vi.mock('@mui/material', async () => {
  const actual = await vi.importActual<typeof import('@mui/material')>('@mui/material')
  return {
    ...actual,
    useMediaQuery: () => mockUseMediaQuery(),
    useTheme: () => mockUseTheme(),
  }
})

describe('App route composition', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockUseMediaQuery.mockReturnValue(false)
    mockUseTheme.mockReturnValue({
      breakpoints: { down: (key: string) => key },
      palette: { mode: 'light', grey: { 200: '#eee', 800: '#333' } },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('renders in browser mode', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
  })

  it('renders in hash mode', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'hash')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
  })

  it('renders when build mode is ipfs', async () => {
    vi.stubEnv('MODE', 'ipfs')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
  })

  it('passes commonality branding to AppShell', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Commonality' })).toBeInTheDocument()
  })

  it('passes content-funding branding to AppShell', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'content-funding')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Content Funding' })).toBeInTheDocument()
  })

  it('passes noninflammatory branding to AppShell', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'noninflammatory')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Noninflammatory Content' })).toBeInTheDocument()
  })

  it('passes movement branding to AppShell', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'movement')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Common Sense Majority' })).toBeInTheDocument()
  })

  it('defaults to commonality when VITE_DOMAIN is not set', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Commonality' })).toBeInTheDocument()
  })

  it('renders commonality primary navigation items', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Start Here' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Statements' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Creators' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument()
  })

  it('renders content-funding primary navigation (Creators only)', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'content-funding')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Creators' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument()
  })

  it('renders movement primary navigation (Browse Content + Projects)', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'movement')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('link', { name: 'Browse Content' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
  })

  it('renders the More button for secondary navigation', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
  })

  it('renders commonality footer text', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(
      screen.getByText(/Commonality helps people fund projects and content/i),
    ).toBeInTheDocument()
  })

  it('renders content-funding footer text', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'content-funding')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByText(/Content Funding helps creators/i)).toBeInTheDocument()
  })

  it('renders children (domain routes) inside the main content area', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    const main = document.querySelector('main')
    expect(main).toBeInTheDocument()
    expect(main?.textContent).toContain('Find common ground')
  })

  it('renders wallet button in the toolbar', async () => {
    vi.stubEnv('MODE', 'development')
    vi.stubEnv('VITE_ROUTER_MODE', 'browser')
    vi.stubEnv('VITE_DOMAIN', 'commonality')

    const { default: App } = await import('./App')

    render(React.createElement(App))

    expect(screen.getByRole('button', { name: 'Wallet' })).toBeInTheDocument()
  })
})
