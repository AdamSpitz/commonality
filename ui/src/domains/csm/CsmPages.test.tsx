import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  CsmCreatorsPage,
  CsmBrowsePage,
  CsmChannelPage,
  CsmCreateContractPage,
  CsmCreatorDashboardPage,
  CsmContractPage,
  CsmProjectsPage,
  CsmCreateProjectPage,
  CsmProjectDetailPage,
  CsmOrganizingPage,
  CsmAboutPage,
} from './CsmPages'

vi.mock('../../content-funding/pages/CreatorsLandingPage', () => ({
  CreatorsLandingPage: vi.fn(({
    title,
    description,
    secondaryDescription,
    learnMoreLabel,
    learnMorePath,
  }: any) => (
    <div>
      <h1>{title}</h1>
      <p data-testid="description">{description}</p>
      <p data-testid="secondary-description">{secondaryDescription}</p>
      {learnMoreLabel && <a href={learnMorePath || '#'}>{learnMoreLabel}</a>}
    </div>
  )),
}))

vi.mock('../../content-funding/pages/BrowseCreatorsPage', () => ({
  BrowseCreatorsPage: vi.fn(({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p data-testid="description">{description}</p>
    </div>
  )),
}))

vi.mock('../../content-funding/pages/ChannelPage', () => ({
  ChannelPage: vi.fn(({
    campaignHeading,
    createCampaignLabel,
    emptyCampaignState,
    unclaimedHeroDescription,
    shareHeading,
    shareDescription,
    suggestedMessagePrefix,
  }: any) => (
    <div>
      <h1>{campaignHeading}</h1>
      <p data-testid="create-label">{createCampaignLabel}</p>
      <p data-testid="empty-state">{emptyCampaignState}</p>
      <p data-testid="unclaimed">{unclaimedHeroDescription}</p>
      <p data-testid="share-heading">{shareHeading}</p>
      <p data-testid="share">{shareDescription}</p>
      <p data-testid="message-prefix">{suggestedMessagePrefix}</p>
    </div>
  )),
}))

vi.mock('../../content-funding/pages/CreateContractPage', () => ({
  CreateContractPage: vi.fn(({
    titlePrefix,
    connectPrompt,
    contentItemsDescription,
    contractDetailsDescription,
    createButtonLabel,
    viewButtonLabel,
    shareSuccessHeading,
    unclaimedAlert,
    verifiedAlert,
    creatorControlledAlert,
  }: any) => (
    <div>
      <h1>{titlePrefix}</h1>
      <p data-testid="connect-prompt">{connectPrompt}</p>
      <p data-testid="content-items">{contentItemsDescription}</p>
      <p data-testid="contract-details">{contractDetailsDescription}</p>
      <p data-testid="create-button">{createButtonLabel}</p>
      <p data-testid="view-button">{viewButtonLabel}</p>
      <p data-testid="share-success">{shareSuccessHeading}</p>
      <p data-testid="unclaimed-alert">{unclaimedAlert}</p>
      <p data-testid="verified-alert">{verifiedAlert}</p>
      <p data-testid="creator-alert">{creatorControlledAlert}</p>
    </div>
  )),
}))

vi.mock('../../content-funding/pages/CreatorDashboardPage', () => ({
  CreatorDashboardPage: vi.fn(({ title, description, connectPrompt, emptyState }: any) => (
    <div>
      <h1>{title}</h1>
      <p data-testid="description">{description}</p>
      <p data-testid="connect-prompt">{connectPrompt}</p>
      <p data-testid="empty-state">{emptyState}</p>
    </div>
  )),
}))

vi.mock('../../pubstarter/pages/BrowseProjectsPage', () => ({
  BrowseProjectsPage: vi.fn(() => <div data-testid="browse-projects">BrowseProjectsPage</div>),
}))

vi.mock('../../pubstarter/pages/CreateProjectPage', () => ({
  CreateProjectPage: vi.fn(() => <div data-testid="create-project">CreateProjectPage</div>),
}))

vi.mock('../../pubstarter/pages/ProjectDetailPage', () => ({
  ProjectDetailPage: vi.fn(() => <div data-testid="project-detail">ProjectDetailPage</div>),
}))

vi.mock('../components/DomainLandingPage', () => ({
  DomainLandingPage: vi.fn(({
    eyebrow,
    title,
    description,
    spotlightLabel,
    spotlightText,
    heroActions,
    sections,
  }: any) => (
    <div>
      <p data-testid="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p data-testid="description">{description}</p>
      <p data-testid="spotlight-label">{spotlightLabel}</p>
      <p data-testid="spotlight-text">{spotlightText}</p>
      <div data-testid="hero-actions">
        {heroActions.map((action: any, i: number) => (
          <a key={i} href={action.path ?? action.href} data-testid={`hero-action-${i}`}>
            {action.label}
          </a>
        ))}
      </div>
      <div data-testid="sections">
        {sections.map((section: any, i: number) => (
          <div key={i} data-testid={`section-${i}`}>
            <p data-testid={`section-eyebrow-${i}`}>{section.eyebrow}</p>
            <h2>{section.title}</h2>
            <p data-testid={`section-desc-${i}`}>{section.description}</p>
            <a href={section.path ?? section.href}>{section.cta}</a>
          </div>
        ))}
      </div>
    </div>
  )),
}))

describe('Movement branded surfaces', () => {
  describe('Creators landing page', () => {
    it('renders the movement-specific content wrapper copy', () => {
      render(
        <MemoryRouter>
          <CsmCreatorsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /movement content/i })).toBeInTheDocument()
      expect(screen.getByText(/main wedge/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /how this movement surface works/i })).toHaveAttribute('href', '/about')
    })

    it('includes secondary description about bridge-building work', () => {
      render(
        <MemoryRouter>
          <CsmCreatorsPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/inspect attestation-backed bridge-building work/i),
      ).toBeInTheDocument()
    })
  })

  describe('Browse page', () => {
    it('renders branded browse title and description', () => {
      render(
        <MemoryRouter>
          <CsmBrowsePage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /browse hidden-majority content/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/browse media that reveals broad agreement hiding behind the usual coalition noise/i),
      ).toBeInTheDocument()
    })

    it('mentions revealing broad agreement', () => {
      render(
        <MemoryRouter>
          <CsmBrowsePage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/emphasizes media that reveals broad agreement/i),
      ).toBeInTheDocument()
    })
  })

  describe('Channel page', () => {
    it('renders movement branded channel copy', () => {
      render(
        <MemoryRouter>
          <CsmChannelPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /movement content contracts/i })).toBeInTheDocument()
      expect(screen.getByTestId('create-label')).toHaveTextContent('Fund Movement Content')
    })

    it('includes unclaimed description about hidden-majority positions', () => {
      render(
        <MemoryRouter>
          <CsmChannelPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/surface hidden-majority positions/i),
      ).toBeInTheDocument()
    })

    it('includes share heading about bringing creator into movement', () => {
      render(
        <MemoryRouter>
          <CsmChannelPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('share-heading')).toHaveTextContent('Bring this creator into the movement')
    })
  })

  describe('Create contract page', () => {
    it('renders movement branded create contract copy', () => {
      render(
        <MemoryRouter>
          <CsmCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /create movement content contract/i }),
      ).toBeInTheDocument()
      expect(screen.getByTestId('create-button')).toHaveTextContent('Create Movement Contract')
      expect(screen.getByTestId('view-button')).toHaveTextContent('View Movement Contract')
    })

    it('includes content items description about hidden majority', () => {
      render(
        <MemoryRouter>
          <CsmCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/make a hidden majority visible/i),
      ).toBeInTheDocument()
    })

    it('includes contract details description about common-sense majority', () => {
      render(
        <MemoryRouter>
          <CsmCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/helps organize around a common-sense majority/i),
      ).toBeInTheDocument()
    })

    it('includes unclaimed alert about supporter-opened contract', () => {
      render(
        <MemoryRouter>
          <CsmCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/starts as a supporter-opened movement content contract/i),
      ).toBeInTheDocument()
    })

    it('includes verified alert about funds going to creator', () => {
      render(
        <MemoryRouter>
          <CsmCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/funds from this movement content contract go directly to the creator/i),
      ).toBeInTheDocument()
    })

    it('includes creator-controlled alert about first-party contract', () => {
      render(
        <MemoryRouter>
          <CsmCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/you can create a first-party movement content contract/i),
      ).toBeInTheDocument()
    })
  })

  describe('Creator dashboard page', () => {
    it('renders branded dashboard title and description', () => {
      render(
        <MemoryRouter>
          <CsmCreatorDashboardPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /movement creator dashboard/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/verify channels, manage escrowed balances/i),
      ).toBeInTheDocument()
    })

    it('includes empty state about bridge-building work', () => {
      render(
        <MemoryRouter>
          <CsmCreatorDashboardPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/no eligible movement content channels.*bridge-building work/i),
      ).toBeInTheDocument()
    })
  })

  describe('Contract page', () => {
    it('renders movement contract heading', () => {
      render(
        <MemoryRouter>
          <CsmContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /movement content contract/i }),
      ).toBeInTheDocument()
    })

    it('includes description about common sense majority surface', () => {
      render(
        <MemoryRouter>
          <CsmContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/keeps movement-focused content links on the common sense majority surface/i),
      ).toBeInTheDocument()
    })

    it('renders the shared ProjectDetailPage', () => {
      render(
        <MemoryRouter>
          <CsmContractPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('project-detail')).toBeInTheDocument()
    })
  })

  describe('Projects page', () => {
    it('renders organizing projects heading', () => {
      render(
        <MemoryRouter>
          <CsmProjectsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /organizing projects/i })).toBeInTheDocument()
    })

    it('includes description about pubstarter infrastructure for movement work', () => {
      render(
        <MemoryRouter>
          <CsmProjectsPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/back concrete work that helps hidden majorities coordinate in public/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/canvassing, research, coalition-building, advocacy/i),
      ).toBeInTheDocument()
    })

    it('includes action buttons for starting a project and viewing playbook', () => {
      render(
        <MemoryRouter>
          <CsmProjectsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('link', { name: /start a movement project/i })).toHaveAttribute('href', '/projects/new')
      expect(screen.getByRole('link', { name: /see the organizing playbook/i })).toHaveAttribute('href', '/organize')
    })

    it('renders the shared BrowseProjectsPage', () => {
      render(
        <MemoryRouter>
          <CsmProjectsPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('browse-projects')).toBeInTheDocument()
    })
  })

  describe('Create project page', () => {
    it('renders movement project creation heading', () => {
      render(
        <MemoryRouter>
          <CsmCreateProjectPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /start a movement project/i }),
      ).toBeInTheDocument()
    })

    it('includes description about organizing outcomes', () => {
      render(
        <MemoryRouter>
          <CsmCreateProjectPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/keeps the ask tied to movement outcomes/i),
      ).toBeInTheDocument()
    })

    it('renders the shared CreateProjectPage', () => {
      render(
        <MemoryRouter>
          <CsmCreateProjectPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('create-project')).toBeInTheDocument()
    })
  })

  describe('Project detail page', () => {
    it('renders movement project heading', () => {
      render(
        <MemoryRouter>
          <CsmProjectDetailPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /movement project/i })).toBeInTheDocument()
    })

    it('includes description about common sense majority frame', () => {
      render(
        <MemoryRouter>
          <CsmProjectDetailPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/keeps organizing work in the common sense majority frame/i),
      ).toBeInTheDocument()
    })

    it('renders the shared ProjectDetailPage', () => {
      render(
        <MemoryRouter>
          <CsmProjectDetailPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('project-detail')).toBeInTheDocument()
    })
  })

  describe('Organizing page', () => {
    it('renders organizing eyebrow and title', () => {
      render(
        <MemoryRouter>
          <CsmOrganizingPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('eyebrow')).toHaveTextContent('Organizing')
      expect(
        screen.getByRole('heading', { name: /turn bridge-building content into visible, fundable political coordination/i }),
      ).toBeInTheDocument()
    })

    it('includes primary loop spotlight text', () => {
      render(
        <MemoryRouter>
          <CsmOrganizingPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('spotlight-label')).toHaveTextContent('Primary loop')
      expect(
        screen.getByText(/fund content that reveals common ground/i),
      ).toBeInTheDocument()
    })

    it('includes hero action links', () => {
      render(
        <MemoryRouter>
          <CsmOrganizingPage />
        </MemoryRouter>,
      )

      const heroActions = screen.getByTestId('hero-actions')
      const heroLinks = within(heroActions).getAllByRole('link')
      expect(heroLinks).toHaveLength(3)
      expect(heroLinks[0]).toHaveAttribute('href', '/content')
      expect(heroLinks[1]).toHaveAttribute('href', '/projects/new')
      expect(heroLinks[2]).toHaveAttribute('href', '#')
    })

    it('includes three sections: Content, Funding, Tally', () => {
      render(
        <MemoryRouter>
          <CsmOrganizingPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('section-eyebrow-0')).toHaveTextContent('Content')
      expect(screen.getByTestId('section-eyebrow-1')).toHaveTextContent('Funding')
      expect(screen.getByTestId('section-eyebrow-2')).toHaveTextContent('Tally')
    })

    it('includes section CTAs with correct links', () => {
      render(
        <MemoryRouter>
          <CsmOrganizingPage />
        </MemoryRouter>,
      )

      const sections = screen.getByTestId('sections')
      // Content section CTA
      const contentSection = screen.getByTestId('section-0')
      expect(contentSection.querySelector('a')).toHaveAttribute('href', '/content')
      // Funding section CTA
      expect(sections).toContainElement(screen.getByRole('link', { name: 'Browse organizing projects' }))
      // Tally section CTA
      const tallySection = screen.getByTestId('section-2')
      expect(within(tallySection).getByRole('link', { name: 'Open Tally statements' })).toHaveAttribute('href', '#')
    })
  })

  describe('About page', () => {
    it('renders about heading', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /about common sense majority/i }),
      ).toBeInTheDocument()
    })

    it('explains the movement layer concept', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/two million people independently wrote versions/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/did not join the same party/i)).toBeInTheDocument()
    })

    it('includes "What this movement is for" section', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /what this movement is for/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/showing that broad agreement exists/i),
      ).toBeInTheDocument()
    })

    it('includes "How the pieces fit" section', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /how the pieces fit/i }),
      ).toBeInTheDocument()
    })

    it('includes "Start organizing" section with action buttons', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /start organizing/i }),
      ).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /open the organizing playbook/i })).toHaveAttribute('href', '/organize')
      expect(screen.getByRole('link', { name: /browse movement content/i })).toHaveAttribute('href', '/content')
      expect(screen.getByRole('link', { name: /browse projects/i })).toHaveAttribute('href', '/projects')
      expect(screen.getByRole('link', { name: /open tally/i })).toHaveAttribute('href', '#')
    })
  })
})
