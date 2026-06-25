import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetActiveDomain = vi.fn()
const mockIsHashRouting = vi.fn()

vi.mock('./domains', () => ({
  getActiveDomain: () => mockGetActiveDomain(),
  getDomainManifest: vi.fn(),
  domainManifests: {},
}))

vi.mock('./shared/routing/routing', () => ({
  isHashRouting: () => mockIsHashRouting(),
  getAppUrl: vi.fn(),
}))

vi.mock('./shared/components/AppShell', () => ({
  AppShell: ({ branding, navigation, children }: { branding: { name: string }; navigation: { primaryNavigation: Array<{label: string; path: string}>; secondaryNavigation: Array<{label: string; path: string}>; footerText: string }; children: React.ReactNode }) => (
    <div data-testid="app-shell">
      <span>{branding.name}</span>
      {navigation.primaryNavigation.map(item => (
        <a key={item.path} href={item.path}>{item.label}</a>
      ))}
      {navigation.secondaryNavigation.length > 0 && (
        <button type="button">More</button>
      )}
      <footer>{navigation.footerText}</footer>
      <button type="button">Wallet</button>
      <main>{children}</main>
    </div>
  ),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div data-router="browser">{children}</div>,
    HashRouter: ({ children }: { children: React.ReactNode }) => <div data-router="hash">{children}</div>,
    Routes: ({ children }: { children: React.ReactNode }) => <div data-routes>{children}</div>,
    Route: () => null,
    MemoryRouter: ({ children }: { children: React.ReactNode }) => <div data-router="memory">{children}</div>,
  }
})

import React from 'react'
import { render, screen } from '@testing-library/react'

describe('App route composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsHashRouting.mockReturnValue(false)
  })

  const fakeDomain = (name: string, primaryNav: Array<{ label: string; path: string }>, footerText: string) => ({
    id: 'commonality' as const,
    branding: { name, tagline: 'tagline' },
    shell: {
      primaryNavigation: primaryNav,
      secondaryNavigation: [{ label: 'More', path: '/more' }],
      footerText,
    },
    features: {},
    basePath: '/',
    routes: <div data-testid="domain-routes">Find common ground</div>,
    LandingPage: () => <div>Landing</div>,
  })

  describe('routing mode', () => {
    it('uses BrowserRouter when not hash routing', async () => {
      mockIsHashRouting.mockReturnValue(false)
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(document.querySelector('[data-router="browser"]')).toBeInTheDocument()
    })

    it('uses HashRouter when hash routing is enabled', async () => {
      mockIsHashRouting.mockReturnValue(true)
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(document.querySelector('[data-router="hash"]')).toBeInTheDocument()
    })

    it('falls back to HashRouter in ipfs mode', async () => {
      mockIsHashRouting.mockReturnValue(true)
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(document.querySelector('[data-router="hash"]')).toBeInTheDocument()
    })
  })

  describe('branding passthrough', () => {
    it('passes commonality branding to AppShell', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Commonality')).toBeInTheDocument()
    })

    it('passes content-funding branding to AppShell', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Content Funding', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Content Funding')).toBeInTheDocument()
    })

    it('passes civility branding to AppShell', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Civility', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Civility')).toBeInTheDocument()
    })

    it('passes movement branding to AppShell', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Common Sense Majority', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
    })
  })

  describe('primary navigation per domain', () => {
    it('renders commonality primary navigation items', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [
        { label: 'Start Here', path: '/docs' },
        { label: 'Statements', path: '/statements' },
        { label: 'Projects', path: '/projects' },
        { label: 'Creators', path: '/content' },
        { label: 'My Profile', path: '/profile' },
      ], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Start Here')).toBeInTheDocument()
      expect(screen.getByText('Statements')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
      expect(screen.getByText('Creators')).toBeInTheDocument()
      expect(screen.getByText('My Profile')).toBeInTheDocument()
    })

    it('renders content-funding primary navigation (Creators only)', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Content Funding', [
        { label: 'Creators', path: '/content' },
      ], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Creators')).toBeInTheDocument()
      expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    })

    it('renders movement primary navigation (Browse Content + Projects)', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Common Sense Majority', [
        { label: 'Browse Content', path: '/content' },
        { label: 'Projects', path: '/projects' },
      ], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Browse Content')).toBeInTheDocument()
      expect(screen.getByText('Projects')).toBeInTheDocument()
    })
  })

  describe('shared UI surfaces', () => {
    it('renders the More button for secondary navigation', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
    })

    it('renders commonality footer text', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'Commonality helps people fund projects and content'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Commonality helps people fund projects and content')).toBeInTheDocument()
    })

    it('renders content-funding footer text', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Content Funding', [], 'Content Funding helps creators'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByText('Content Funding helps creators')).toBeInTheDocument()
    })

    it('renders children (domain routes) inside the main content area', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      const main = document.querySelector('main')
      expect(main).toBeInTheDocument()
      expect(main?.textContent).toContain('Find common ground')
    })

    it('renders wallet button in the toolbar', async () => {
      mockGetActiveDomain.mockReturnValue(fakeDomain('Commonality', [], 'footer'))

      const { default: App } = await import('./App')
      render(React.createElement(App))

      expect(screen.getByRole('button', { name: 'Wallet' })).toBeInTheDocument()
    })
  })
})
