import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CsmLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('CsmLandingPage', () => {
  describe('hero section', () => {
    it('renders eyebrow', () => {
      render(<CsmLandingPage />, { wrapper })
      expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
    })

    it('renders title as h1', () => {
      render(<CsmLandingPage />, { wrapper })
      const title = screen.getByRole('heading', { level: 1, name: /You are not alone/i })
      expect(title).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<CsmLandingPage />, { wrapper })
      expect(screen.getByText(/politically homeless people discover how many others/i)).toBeInTheDocument()
    })

    it('renders spotlight label as chip', () => {
      render(<CsmLandingPage />, { wrapper })
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('Why this matters')
    })

    it('renders spotlight text', () => {
      render(<CsmLandingPage />, { wrapper })
      expect(screen.getByText(/This surface makes the hidden majority visible/i)).toBeInTheDocument()
    })

    it('renders hero action links with correct hrefs', () => {
      render(<CsmLandingPage />, { wrapper })
      expect(
        screen.getAllByRole('link', { name: 'Open statements on Tally' }).some((link) => link.getAttribute('href') === '#'),
      ).toBe(true)
      const links = screen.getAllByRole('link')
      const organizeLink = links.find(l => l.getAttribute('href') === '/organize')
      const aboutLink = links.find(l => l.getAttribute('href') === '/about')
      const contentLink = links.find(l => l.getAttribute('href') === '/content')
      const projectsLink = links.find(l => l.getAttribute('href') === '/projects')
      expect(organizeLink).toBeInTheDocument()
      expect(aboutLink).toBeInTheDocument()
      expect(contentLink).toBeInTheDocument()
      expect(projectsLink).toBeInTheDocument()
    })
  })

  describe('section cards', () => {
    it('renders all four section cards with titles', () => {
      render(<CsmLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 })
      const titles = sectionTitles.map(h => h.textContent)
      expect(titles).toContain('Move from persuasion to organization')
      expect(titles).toContain('Use noninflammatory content as the wedge')
      expect(titles).toContain('Fund movement projects')
      expect(titles).toContain('Sign movement-aligned statements')
    })

    it('renders section descriptions', () => {
      render(<CsmLandingPage />, { wrapper })
      expect(screen.getByText(/visible numbers, useful media/i)).toBeInTheDocument()
      expect(screen.getByText(/Start with bridge-building media/i)).toBeInTheDocument()
      expect(screen.getByText(/Back canvassing, research, coalition-building/i)).toBeInTheDocument()
      expect(screen.getByText(/direct plus indirect support add up/i)).toBeInTheDocument()
    })

    it('renders section CTA links with correct hrefs', () => {
      render(<CsmLandingPage />, { wrapper })
      const links = screen.getAllByRole('link')
      const organizeLink = links.find(l => l.getAttribute('href') === '/organize')
      const contentLink = links.find(l => l.getAttribute('href') === '/content')
      const projectsLink = links.find(l => l.getAttribute('href') === '/projects')
      const statementsLink = links.find(l => l.textContent === 'Open statements on Tally' && l.getAttribute('href') === '#')
      expect(organizeLink).toBeInTheDocument()
      expect(contentLink).toBeInTheDocument()
      expect(projectsLink).toBeInTheDocument()
      expect(statementsLink).toBeInTheDocument()
    })

    it('renders section eyebrows', () => {
      render(<CsmLandingPage />, { wrapper })
      expect(screen.getByText('Playbook')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Organize')).toBeInTheDocument()
      expect(screen.getByText('Tally')).toBeInTheDocument()
    })
  })
})
