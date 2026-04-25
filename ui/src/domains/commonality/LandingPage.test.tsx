import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CommonalityLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('CommonalityLandingPage', () => {
  describe('hero section', () => {
    it('renders eyebrow', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText('Commonality')).toBeInTheDocument()
    })

    it('renders title as h1', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const title = screen.getByRole('heading', { level: 1, name: /Find common ground first/i })
      expect(title).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText(/Commonality is the full platform/i)).toBeInTheDocument()
    })

    it('renders spotlight label as chip', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('Full platform')
    })

    it('renders spotlight text', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText(/Use this domain when you want the whole system/i)).toBeInTheDocument()
    })

    it('renders hero action links with correct hrefs', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const links = screen.getAllByRole('link')
      const hrefs = links.map(l => l.getAttribute('href'))
      expect(hrefs).toContain('/docs')
      expect(hrefs).toContain('/statements')
      expect(hrefs).toContain('/projects')
    })
  })

  describe('section cards', () => {
    it('renders all three section cards with titles', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 })
      const titles = sectionTitles.map(h => h.textContent)
      expect(titles).toContain('Statements and implication graphs')
      expect(titles).toContain('Projects and funding portals')
      expect(titles).toContain('Content funding and bridge-building')
    })

    it('renders section descriptions', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText(/Start with the conceptspace/i)).toBeInTheDocument()
      expect(screen.getByText(/Fund projects directly/i)).toBeInTheDocument()
      expect(screen.getByText(/The same infrastructure also powers/i)).toBeInTheDocument()
    })

    it('renders section CTA links with correct hrefs', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const links = screen.getAllByRole('link')
      const statementsLink = links.find(l => l.getAttribute('href') === '/statements')
      const projectsLink = links.find(l => l.getAttribute('href') === '/projects')
      const contentLink = links.find(l => l.getAttribute('href') === '/content')
      expect(statementsLink).toBeInTheDocument()
      expect(projectsLink).toBeInTheDocument()
      expect(contentLink).toBeInTheDocument()
    })

    it('renders section eyebrows', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText('Common ground')).toBeInTheDocument()
      expect(screen.getByText('Public goods')).toBeInTheDocument()
      expect(screen.getByText('Focused domains')).toBeInTheDocument()
    })
  })

  describe('focused domain entry points', () => {
    it('renders section heading', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('heading', { level: 5, name: 'Focused domain entry points' })).toBeInTheDocument()
    })

    it('renders all three focused domain cards', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText('Content Funding')).toBeInTheDocument()
      expect(screen.getByText('Noninflammatory Content')).toBeInTheDocument()
      expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
    })

    it('renders focused domain descriptions', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByText(/A dedicated entry point for funding tweets/i)).toBeInTheDocument()
      expect(screen.getByText(/A more opinionated surface for rewarding content/i)).toBeInTheDocument()
      expect(screen.getByText(/A movement-oriented framing built on the same/i)).toBeInTheDocument()
    })
  })
})
