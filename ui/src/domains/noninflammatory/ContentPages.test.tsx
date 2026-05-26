import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import {
  NoninflammatoryCreatorsPage,
  NoninflammatoryBrowsePage,
  NoninflammatoryChannelPage,
  NoninflammatoryCreateContractPage,
  NoninflammatoryCreatorDashboardPage,
  NoninflammatoryContractPage,
  NoninflammatoryAboutPage,
} from './ContentPages'

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

vi.mock('../../lazyGiving/pages/ProjectDetailPage', () => ({
  ProjectDetailPage: vi.fn(() => <div data-testid="project-detail">ProjectDetailPage</div>),
}))

describe('Noninflammatory branded surfaces', () => {
  describe('Creators landing page', () => {
    it('renders the noninflammatory-specific wrapper copy', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreatorsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /civility/i })).toBeInTheDocument()
      expect(screen.getByText(/bridge-building/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /why this domain exists/i })).toHaveAttribute('href', '/about')
    })

    it('includes secondary description about platform browsing', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreatorsPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/Open a channel to see active contracts and funded content/i),
      ).toBeInTheDocument()
    })
  })

  describe('Browse page', () => {
    it('renders branded browse title and description', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryBrowsePage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /browse bridge-building creators/i }),
      ).toBeInTheDocument()
      expect(
        screen.getByText(/Browse channels and content that aim to lower the temperature/i),
      ).toBeInTheDocument()
    })

    it('mentions lowering the temperature rather than farming engagement', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryBrowsePage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/See which creators are funded, what contracts are active/i),
      ).toBeInTheDocument()
    })
  })

  describe('Channel page', () => {
    it('renders noninflammatory branded channel copy', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryChannelPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /civility contracts/i })).toBeInTheDocument()
      expect(screen.getByTestId('create-label')).toHaveTextContent('Create Civility Contract')
    })

    it('includes unclaimed description about hearing each other', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryChannelPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/helps people on opposite sides hear each other/i),
      ).toBeInTheDocument()
    })

    it('includes share heading and description about bridge-building', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryChannelPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('share-heading')).toHaveTextContent('Invite the creator in')
      expect(
        screen.getByText(/send them the claim link so they can verify the channel/i),
      ).toBeInTheDocument()
    })
  })

  describe('Create contract page', () => {
    it('renders noninflammatory branded create contract copy', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /create civility contract/i }),
      ).toBeInTheDocument()
      expect(screen.getByTestId('create-button')).toHaveTextContent('Create Civility Contract')
    })

    it('includes content items description about steelmanning', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/steelmans the other side, avoids contempt/i),
      ).toBeInTheDocument()
    })

    it('includes contract details description about IPFS', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/these contract details are stored on ipfs/i),
      ).toBeInTheDocument()
    })

    it('includes unclaimed alert about fan-funded contract', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/starts as a fan-funded noninflammatory contract/i),
      ).toBeInTheDocument()
    })

    it('includes verified alert about funds going directly to creator', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/funds from this noninflammatory contract go directly to the creator/i),
      ).toBeInTheDocument()
    })

    it('includes creator-controlled alert about first-party contract', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreateContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/you can create a first-party noninflammatory contract/i),
      ).toBeInTheDocument()
    })
  })

  describe('Creator dashboard page', () => {
    it('renders branded dashboard title and description', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreatorDashboardPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /creator dashboard/i })).toBeInTheDocument()
      expect(
        screen.getByText(/verify channels, withdraw escrowed balances/i),
      ).toBeInTheDocument()
    })

    it('includes empty state about bridge-building work', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryCreatorDashboardPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/no eligible channels found.*verify a channel.*noninflammatory work/i),
      ).toBeInTheDocument()
    })
  })

  describe('Contract page', () => {
    it('renders noninflammatory contract heading', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /civility contract/i }),
      ).toBeInTheDocument()
    })

    it('includes description about bridge-building domain', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryContractPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/See who pledged, what content is covered, and why it was submitted under the bridge-building standard/i),
      ).toBeInTheDocument()
    })

    it('renders the shared ProjectDetailPage', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryContractPage />
        </MemoryRouter>,
      )

      expect(screen.getByTestId('project-detail')).toBeInTheDocument()
    })
  })

  describe('About page', () => {
    it('renders about heading', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByRole('heading', { name: /about civility/i }),
      ).toBeInTheDocument()
    })

    it('explains the point is not bland centrism', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(
        screen.getByText(/The point is not bland centrism/i),
      ).toBeInTheDocument()
      expect(screen.getByText(/fund writing and media that helps people on opposite sides actually hear each other/i)).toBeInTheDocument()
    })

    it('includes "Who this is for" with readers, creators, and delegates', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /who this is for/i })).toBeInTheDocument()
      expect(screen.getByText(/readers and donors/i)).toBeInTheDocument()
      expect(screen.getByText(/creators/i)).toBeInTheDocument()
      expect(screen.getByText(/delegates and taste-makers/i)).toBeInTheDocument()
    })

    it('explains what counts as noninflammatory: generic plus point-of-view-specific', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /what counts as noninflammatory/i })).toBeInTheDocument()
      expect(screen.getByText(/Point-of-view-specific/i)).toBeInTheDocument()
      expect(screen.getByText(/each side define what does not piss them off/i)).toBeInTheDocument()
    })

    it('explains how funding stays easy: AI legwork, open evaluators, or delegate', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /how funding stays easy/i })).toBeInTheDocument()
      expect(screen.getByText(/AI does the legwork/i)).toBeInTheDocument()
      expect(screen.getByText(/delegate your money to someone whose judgment you trust/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /read their actual prompts/i })).toHaveAttribute(
        'href',
        '/docs/noninflammatory/evaluator-prompts',
      )
    })

    it('explains you can fund your own side to reach the other side', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByText(/fund your own side's content judged by the other side's filter/i)).toBeInTheDocument()
    })

    it('includes the one-breath pitch with the monthly pledge and delegation', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /the whole thing, in one breath/i })).toBeInTheDocument()
      expect(screen.getByText(/\$10 a month toward making more noninflammatory content exist/i)).toBeInTheDocument()
    })

    it('includes "How money and attestations flow" section', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /how money and attestations flow/i })).toBeInTheDocument()
      expect(screen.getByText(/ai evaluators assess whether content meets the noninflammatory standard/i)).toBeInTheDocument()
    })

    it('includes richer pass and fail examples', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /what passes and what fails/i })).toBeInTheDocument()
      expect(screen.getByText('Passing example')).toBeInTheDocument()
      expect(screen.getByText('Failing example')).toBeInTheDocument()
      expect(screen.getByText('Another passing example')).toBeInTheDocument()
      expect(screen.getByText(/engages with the strongest progressive arguments/i)).toBeInTheDocument()
      expect(screen.getByText(/leans on mockery, contempt, or cheap outgroup cues/i)).toBeInTheDocument()
    })

    it('prominently links the walkthrough', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /read the walkthrough/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /read the full walkthrough/i })).toHaveAttribute('href', '#')
    })

    it('includes "How this site relates to the others" with a Tally link', () => {
      render(
        <MemoryRouter>
          <NoninflammatoryAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /how this site relates to the others/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /explore statements on tally/i })).toHaveAttribute(
        'href',
        '#',
      )
    })
  })
})
