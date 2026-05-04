import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: undefined, isConnected: false }),
}))

vi.mock('connectkit', () => ({
  ConnectKitButton: () => <button type="button">Connect</button>,
}))

vi.mock('./WalletButton', () => ({
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

function renderWithRouter(initialEntries = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AppShell>
        <div data-testid="page-content">Page Content</div>
      </AppShell>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMediaQuery.mockReturnValue(false)
    mockUseTheme.mockReturnValue({
      breakpoints: { down: (key: string) => key },
      palette: { mode: 'light', grey: { 200: '#eee', 800: '#333' } },
    })
  })

  describe('branding', () => {
    it('renders default Commonality branding', () => {
      renderWithRouter()
      expect(screen.getByRole('link', { name: 'Commonality' })).toBeInTheDocument()
    })

    it('renders custom branding when provided', () => {
      render(
        <MemoryRouter>
          <AppShell branding={{ name: 'Custom Brand', tagline: 'Custom tagline' }}>
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: 'Custom Brand' })).toBeInTheDocument()
    })
  })

  describe('primary navigation', () => {
    it('renders default primary nav items', () => {
      renderWithRouter()
      expect(screen.getByRole('link', { name: 'Start Here' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Statements' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Creators' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument()
    })

    it('highlights "Start Here" button when on /docs', () => {
      renderWithRouter(['/docs'])
      const startHereButton = screen.getByRole('link', { name: 'Start Here' })
      expect(startHereButton).toHaveStyle({ fontWeight: '700' })
    })

    it('highlights Statements when on /statements', () => {
      renderWithRouter(['/statements'])
      const statementsButton = screen.getByRole('link', { name: 'Statements' })
      expect(statementsButton).toHaveStyle({ fontWeight: '700' })
    })

    it('highlights Projects when on /projects', () => {
      renderWithRouter(['/projects'])
      const projectsButton = screen.getByRole('link', { name: 'Projects' })
      expect(projectsButton).toHaveStyle({ fontWeight: '700' })
    })

    it('highlights Creators when on /content', () => {
      renderWithRouter(['/content'])
      const creatorsButton = screen.getByRole('link', { name: 'Creators' })
      expect(creatorsButton).toHaveStyle({ fontWeight: '700' })
    })

    it('highlights My Profile when on /profile', () => {
      renderWithRouter(['/profile'])
      const profileButton = screen.getByRole('link', { name: 'My Profile' })
      expect(profileButton).toHaveStyle({ fontWeight: '700' })
    })

    it('renders custom primary navigation when provided', () => {
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [{ label: 'Home', path: '/' }],
              secondaryNavigation: [],
              footerText: 'Footer',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Statements' })).not.toBeInTheDocument()
    })

    it('renders external primary navigation as a normal anchor', () => {
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [{ label: 'Open Tally', href: 'https://tally.example/statements' }],
              secondaryNavigation: [],
              footerText: 'Footer',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )
      expect(screen.getByRole('link', { name: 'Open Tally' })).toHaveAttribute('href', 'https://tally.example/statements')
    })
  })

  describe('secondary navigation (More menu)', () => {
    it('renders More button on desktop', () => {
      renderWithRouter()
      expect(screen.getByRole('button', { name: 'More' })).toBeInTheDocument()
    })

    it('hides More button when secondary navigation is empty', () => {
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [{ label: 'Home', path: '/' }],
              secondaryNavigation: [],
              footerText: 'Footer',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )

      expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
    })

    it('opens More menu and shows secondary nav items', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'More' }))

      expect(screen.getByRole('menuitem', { name: 'My Delegated Funds' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'My Trust Network' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Creator Dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Twitter Creators' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'YouTube Creators' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Substack Creators' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Saved Refs' })).toBeInTheDocument()
    })

    it('renders external secondary navigation as a normal anchor in the More menu', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [{ label: 'Home', path: '/' }],
              secondaryNavigation: [{ label: 'Conceptspace', href: 'https://conceptspace.example' }],
              footerText: 'Footer',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )

      await user.click(screen.getByRole('button', { name: 'More' }))

      expect(screen.getByRole('menuitem', { name: 'Conceptspace' })).toHaveAttribute('href', 'https://conceptspace.example')
    })

    it('highlights More button when on a secondary nav route', () => {
      renderWithRouter(['/settings'])
      const moreButton = screen.getByRole('button', { name: 'More' })
      expect(moreButton).toHaveStyle({ fontWeight: '700' })
    })

    it('highlights More button when on /notes', () => {
      renderWithRouter(['/notes'])
      const moreButton = screen.getByRole('button', { name: 'More' })
      expect(moreButton).toHaveStyle({ fontWeight: '700' })
    })

    it('closes menu after clicking a menu item', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'More' }))
      await user.click(screen.getByRole('menuitem', { name: 'My Trust Network' }))

      expect(screen.queryByRole('menuitem', { name: 'My Trust Network' })).not.toBeInTheDocument()
    })
  })

  describe('footer', () => {
    it('renders default footer text', () => {
      renderWithRouter()
      expect(
        screen.getByText(/Commonality helps people fund projects and content around shared values/i),
      ).toBeInTheDocument()
    })

    it('renders custom footer text when provided', () => {
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [],
              secondaryNavigation: [],
              footerText: 'Custom footer text',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )
      expect(screen.getByText('Custom footer text')).toBeInTheDocument()
    })
  })

  describe('children', () => {
    it('renders children in the main content area', () => {
      renderWithRouter()
      expect(screen.getByTestId('page-content')).toBeInTheDocument()
    })
  })

  describe('accessibility landmarks', () => {
    it('renders a banner landmark (header)', () => {
      renderWithRouter()
      expect(screen.getByRole('banner')).toBeInTheDocument()
    })

    it('renders a main landmark for content', () => {
      renderWithRouter()
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    it('renders a contentinfo landmark (footer)', () => {
      renderWithRouter()
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })
  })

  describe('mobile/responsive', () => {
    beforeEach(() => {
      mockUseMediaQuery.mockReturnValue(true)
    })

    it('renders hamburger menu button on mobile', () => {
      renderWithRouter()
      expect(screen.getByRole('button', { name: 'open drawer' })).toBeInTheDocument()
    })

    it('does not render desktop primary nav buttons on mobile', () => {
      renderWithRouter()
      expect(screen.queryByRole('link', { name: 'Start Here' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Statements' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Projects' })).not.toBeInTheDocument()
    })

    it('does not render More button on mobile', () => {
      renderWithRouter()
      expect(screen.queryByRole('button', { name: 'More' })).not.toBeInTheDocument()
    })

    it('opens drawer when hamburger is clicked', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByRole('link', { name: 'Start Here' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Statements' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Projects' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Creators' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'My Profile' })).toBeInTheDocument()
    })

    it('shows secondary navigation in drawer on mobile', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByRole('link', { name: 'My Delegated Funds' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'My Trust Network' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Creator Dashboard' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Twitter Creators' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'YouTube Creators' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Substack Creators' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Saved Refs' })).toBeInTheDocument()
    })

    it('shows "Start here" and "More" subheaders in drawer', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByText('Start here')).toBeInTheDocument()
      expect(screen.getByText('More')).toBeInTheDocument()
    })

    it('highlights primary nav item in drawer when on matching route', async () => {
      const user = userEvent.setup()
      renderWithRouter(['/statements'])

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      const statementsLink = screen.getByRole('link', { name: 'Statements' })
      expect(statementsLink).toHaveClass('Mui-selected')
    })

    it('highlights secondary nav item in drawer when on matching route', async () => {
      const user = userEvent.setup()
      renderWithRouter(['/settings'])

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      const trustNetworkLink = screen.getByRole('link', { name: 'My Trust Network' })
      expect(trustNetworkLink).toHaveClass('Mui-selected')
    })

    it('closes drawer after clicking a nav item', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'open drawer' }))
      expect(screen.getByRole('link', { name: 'Statements' })).toBeInTheDocument()

      await user.click(screen.getByRole('link', { name: 'Statements' }))

      expect(screen.queryByRole('link', { name: 'Statements' })).not.toBeInTheDocument()
    })

    it('renders brand name in drawer header', async () => {
      const user = userEvent.setup()
      renderWithRouter()

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByRole('heading', { name: 'Commonality' })).toBeInTheDocument()
    })

    it('renders custom brand name in drawer header', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <AppShell branding={{ name: 'Custom Brand', tagline: 'Custom tagline' }}>
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByRole('heading', { name: 'Custom Brand' })).toBeInTheDocument()
    })

    it('shows custom primary navigation in drawer', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [{ label: 'Home', path: '/' }],
              secondaryNavigation: [],
              footerText: 'Footer',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Statements' })).not.toBeInTheDocument()
    })

    it('shows custom secondary navigation in drawer', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <AppShell
            navigation={{
              primaryNavigation: [],
              secondaryNavigation: [{ label: 'Settings', path: '/settings' }],
              footerText: 'Footer',
            }}
          >
            <div>Content</div>
          </AppShell>
        </MemoryRouter>,
      )

      await user.click(screen.getByRole('button', { name: 'open drawer' }))

      expect(screen.getByRole('link', { name: 'Settings' })).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'My Delegated Funds' })).not.toBeInTheDocument()
    })

    it('renders wallet button on mobile', () => {
      renderWithRouter()
      expect(screen.getByRole('button', { name: 'Wallet' })).toBeInTheDocument()
    })
  })

  describe('wallet button', () => {
    it('renders the wallet button in the toolbar', () => {
      renderWithRouter()
      expect(screen.getByRole('button', { name: 'Wallet' })).toBeInTheDocument()
    })
  })
})
