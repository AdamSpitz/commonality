import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CommonalityLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('CommonalityLandingPage', () => {
  describe('hero section', () => {
    it('renders the Commonality movement framing', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText('Commonality')).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: /better public-goods funding/i })).toBeInTheDocument()
      expect(screen.getByText(/movement site for internet-age coordination/i)).toBeInTheDocument()
    })

    it('renders spotlight copy that starts with user-facing funding actions', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('What you can do here')
      expect(screen.getByText(/Fund public goods without personal risk/i)).toBeInTheDocument()
      expect(screen.getByText(/only pay if enough others join/i)).toBeInTheDocument()
    })

    it('renders hero action links for docs, a walkthrough, projects, and Tally', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('link', { name: 'Start with the thesis' })).toHaveAttribute('href', '/docs')
      expect(screen.getByRole('link', { name: 'See a walkthrough' })).toHaveAttribute('href', '/docs/use-case-walkthroughs/block-party')
      expect(screen.getAllByRole('link', { name: 'Browse projects' })[0]).toHaveAttribute('href', '/projects')
      expect(screen.getAllByRole('link', { name: 'Open Tally' })[0]).toHaveAttribute('href', '#')
    })
  })

  describe('section cards', () => {
    it('renders the funding-focused sections', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 }).map(h => h.textContent)
      expect(sectionTitles).toContain('Internet-age coordination for public goods')
      expect(sectionTitles).toContain('Create and fund public-goods projects')
      expect(sectionTitles).toContain('Route funds through trusted judgment')
    })

    it('renders section descriptions and CTA links', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText(/public goods are badly underproduced/i)).toBeInTheDocument()
      expect(screen.getByText(/Browse projects, start a new assurance contract/i)).toBeInTheDocument()
      expect(screen.getByText(/delegated funding notes/i)).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: 'Read the thesis' })[0]).toHaveAttribute('href', '/docs')
      expect(screen.getAllByRole('link', { name: 'Browse projects' })[2]).toHaveAttribute('href', '/projects')
      expect(screen.getAllByRole('link', { name: 'Manage delegated funds' })[0]).toHaveAttribute('href', '/notes')
    })
  })

  describe('related product sites', () => {
    it('renders choose-your-path cards', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('heading', { level: 5, name: 'Choose your path' })).toBeInTheDocument()
      expect(screen.getByText('I want to fund something')).toBeInTheDocument()
      expect(screen.getByText('I have a project')).toBeInTheDocument()
      expect(screen.getByText('I want to delegate')).toBeInTheDocument()
      expect(screen.getByText('I want to learn more')).toBeInTheDocument()
    })

    it('links out to all sibling product sites', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('heading', { level: 5, name: 'Related product sites' })).toBeInTheDocument()
      expect(screen.getByText('Tally')).toBeInTheDocument()
      expect(screen.getByText('Content Funding')).toBeInTheDocument()
      expect(screen.getByText('Noninflammatory Content')).toBeInTheDocument()
      expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
      expect(screen.getByText('Conceptspace')).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: 'Open Tally' })[1]).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: 'Open Content Funding' })).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: 'Open Noninflammatory Content' })).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: 'Open CSM' })).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: 'Open Conceptspace' })).toHaveAttribute('href', '#')
    })
  })
})
