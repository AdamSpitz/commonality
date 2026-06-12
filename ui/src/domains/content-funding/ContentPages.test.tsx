import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  ContentFundingCreatorsPage,
  ContentFundingBrowsePage,
  ContentFundingChannelPage,
  ContentFundingCreateContractPage,
  ContentFundingCreatorDashboardPage,
  ContentFundingAboutPage,
  ContentFundingContractPage,
} from './ContentPages'

vi.mock('../../content-funding/pages/CreatorsLandingPage', () => ({
  CreatorsLandingPage: vi.fn(({ title, description, secondaryDescription, learnMoreLabel }: any) => (
    <div>
      <h1>{title}</h1>
      <p data-testid="description">{description}</p>
      <p data-testid="secondary-description">{secondaryDescription}</p>
      {learnMoreLabel && <a href="/learn">{learnMoreLabel}</a>}
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
    shareDescription,
  }: any) => (
    <div>
      <h1>{campaignHeading}</h1>
      <p data-testid="create-label">{createCampaignLabel}</p>
      <p data-testid="empty-state">{emptyCampaignState}</p>
      <p data-testid="unclaimed">{unclaimedHeroDescription}</p>
      <p data-testid="share">{shareDescription}</p>
    </div>
  )),
}))

vi.mock('../../content-funding/pages/CreateContractPage', () => ({
  CreateContractPage: vi.fn(({
    titlePrefix,
    connectPrompt,
    contentItemsDescription,
    createButtonLabel,
    viewButtonLabel,
    shareSuccessHeading,
  }: any) => (
    <div>
      <h1>{titlePrefix}</h1>
      <p data-testid="connect-prompt">{connectPrompt}</p>
      <p data-testid="content-items">{contentItemsDescription}</p>
      <p data-testid="create-button">{createButtonLabel}</p>
      <p data-testid="view-button">{viewButtonLabel}</p>
      <p data-testid="share-success">{shareSuccessHeading}</p>
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

vi.mock('../../lazy-giving/pages/ProjectDetailPage', () => ({
  ProjectDetailPage: vi.fn(() => <div data-testid="project-detail">ProjectDetailPage</div>),
}))

describe('Content Funding branded surfaces', () => {
  describe('Creators landing page', () => {
    it('renders the content-funding specific wrapper copy', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreatorsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /content funding/i })).toBeInTheDocument()
      expect(
        screen.getByText(/Browse by platform, back work you care about, and let creators claim what supporters have pooled for them/i),
      ).toBeInTheDocument()
    })

    it('includes secondary description about browsing platforms', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreatorsPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/Open a channel to see active contracts and escrowed funds/i),
      ).toBeInTheDocument()
    })
  })

  describe('Browse page', () => {
    it('renders branded browse title and description', () => {
      render(
        <MemoryRouter>
          <ContentFundingBrowsePage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /browse fundable creators/i })).toBeInTheDocument()
      expect(
        screen.getByText(/find creators on twitter, youtube, and substack/i),
      ).toBeInTheDocument()
    })
  })

  describe('Channel page', () => {
    it('renders content-funding branded channel copy', () => {
      render(
        <MemoryRouter>
          <ContentFundingChannelPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /content funding contracts/i })).toBeInTheDocument()
      expect(screen.getByTestId('create-label')).toHaveTextContent('Start Contract')
    })

    it('includes unclaimed channel description about escrowed funds', () => {
      render(
        <MemoryRouter>
          <ContentFundingChannelPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/this creator has not claimed the channel/i),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/verify your identity and claim the escrowed funds/i),
      ).toBeInTheDocument()
    })

    it('includes share description about claim link', () => {
      render(
        <MemoryRouter>
          <ContentFundingChannelPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/send them the claim link below so they can verify ownership/i),
      ).toBeInTheDocument()
    })
  })

  describe('Create contract page', () => {
    it('renders content-funding branded create contract copy', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /create content funding contract/i }),
      ).toBeInTheDocument()
      expect(screen.getByTestId('create-button')).toHaveTextContent('Create Funding Contract')
    })

    it('includes content items description about posts/videos/essays', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/add the posts, videos, or essays you want this contract to cover/i),
      ).toBeInTheDocument()
    })

    it('includes share success heading about claim link', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/share this claim link with the creator/i),
      ).toBeInTheDocument()
    })
  })

  describe('Creator dashboard page', () => {
    it('renders branded dashboard title and description', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreatorDashboardPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /creator funding dashboard/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/manage claimed channels, withdraw escrowed balances/i),
      ).toBeInTheDocument()
    })

    it('includes empty state about verifying a channel', () => {
      render(
        <MemoryRouter>
          <ContentFundingCreatorDashboardPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/no eligible creator channels found.*verify a channel/i),
      ).toBeInTheDocument()
    })
  })

  describe('About page', () => {
    it('renders a plain-language content funding overview', () => {
      render(
        <MemoryRouter>
          <ContentFundingAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /about content funding/i })).toBeInTheDocument()
      expect(screen.getByText(/reward articles, videos, posts, and channels/i)).toBeInTheDocument()
      expect(screen.getByText(/you liked a youtube essay/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /browse content/i })).toHaveAttribute('href', '/content')
      expect(screen.getByRole('link', { name: /creator dashboard/i })).toHaveAttribute('href', '/content/dashboard')
    })

    it('includes "Who this is for" with readers, creators, and delegates', () => {
      render(
        <MemoryRouter>
          <ContentFundingAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /who this is for/i })).toBeInTheDocument()
      expect(screen.getByText('Readers and donors')).toBeInTheDocument()
      expect(screen.getByText('Creators')).toBeInTheDocument()
      expect(screen.getByText('Delegates')).toBeInTheDocument()
    })

    it('includes "What you can do here" section', () => {
      render(
        <MemoryRouter>
          <ContentFundingAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /what you can do here/i })).toBeInTheDocument()
      expect(screen.getByText(/browse creators by platform/i)).toBeInTheDocument()
      expect(screen.getByText(/pledge funds that stay in escrow/i)).toBeInTheDocument()
    })

    it('includes "How money flows" section', () => {
      render(
        <MemoryRouter>
          <ContentFundingAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /how money flows/i })).toBeInTheDocument()
      expect(screen.getByText(/escrow contract/i)).toBeInTheDocument()
    })

    it('includes "Do I need crypto?" section', () => {
      render(
        <MemoryRouter>
          <ContentFundingAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /do i need crypto/i })).toBeInTheDocument()
      expect(screen.getByText(/credit-card and fiat on-ramps are on the roadmap/i)).toBeInTheDocument()
    })

    it('prominently links the walkthrough', () => {
      render(
        <MemoryRouter>
          <ContentFundingAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /concrete example/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /read the full walkthrough/i })).toHaveAttribute('href', '#')
    })
  })

  describe('Contract page', () => {
    it('renders content-funding contract heading', () => {
      render(
        <MemoryRouter>
          <ContentFundingContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /content funding contract/i }),
      ).toBeInTheDocument()
    })

    it('includes description about keeping contract links in branded surface', () => {
      render(
        <MemoryRouter>
          <ContentFundingContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/See who pledged, what content is covered, and where the escrow stands/i),
      ).toBeInTheDocument()
    })

    it('renders the shared ProjectDetailPage', () => {
      render(
        <MemoryRouter>
          <ContentFundingContractPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('project-detail')).toBeInTheDocument()
    })
  })
})
