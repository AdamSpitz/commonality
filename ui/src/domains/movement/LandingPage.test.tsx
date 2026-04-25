import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { MovementLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('MovementLandingPage', () => {
  describe('hero section', () => {
    it('renders eyebrow', () => {
      render(<MovementLandingPage />, { wrapper })
      expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
    })

    it('renders title as h1', () => {
      render(<MovementLandingPage />, { wrapper })
      const title = screen.getByRole('heading', { level: 1, name: /Organize the hidden majority/i })
      expect(title).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<MovementLandingPage />, { wrapper })
      expect(screen.getByText(/This surface layers movement framing/i)).toBeInTheDocument()
    })

    it('renders spotlight label as chip', () => {
      render(<MovementLandingPage />, { wrapper })
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('Built on Noninflammatory + Commonality')
    })

    it('renders spotlight text', () => {
      render(<MovementLandingPage />, { wrapper })
      expect(screen.getByText(/The movement site is broader than a single content tool/i)).toBeInTheDocument()
    })

    it('renders hero action links with correct hrefs', () => {
      render(<MovementLandingPage />, { wrapper })
      expect(screen.getByRole('link', { name: 'Browse statements' })).toHaveAttribute('href', '/statements')
      const links = screen.getAllByRole('link')
      const organizeLink = links.find(l => l.getAttribute('href') === '/organize')
      const contentLink = links.find(l => l.getAttribute('href') === '/content')
      const projectsLink = links.find(l => l.getAttribute('href') === '/projects')
      expect(organizeLink).toBeInTheDocument()
      expect(contentLink).toBeInTheDocument()
      expect(projectsLink).toBeInTheDocument()
    })
  })

  describe('section cards', () => {
    it('renders all four section cards with titles', () => {
      render(<MovementLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 })
      const titles = sectionTitles.map(h => h.textContent)
      expect(titles).toContain('Move from persuasion to organization')
      expect(titles).toContain('Use noninflammatory content as the wedge')
      expect(titles).toContain('Fund movement projects')
      expect(titles).toContain('Trace ideas back to statements')
    })

    it('renders section descriptions', () => {
      render(<MovementLandingPage />, { wrapper })
      expect(screen.getByText(/Use the organizing surface to connect/i)).toBeInTheDocument()
      expect(screen.getByText(/Start with bridge-building media/i)).toBeInTheDocument()
      expect(screen.getByText(/Use the shared pubstarter and portal infrastructure/i)).toBeInTheDocument()
      expect(screen.getByText(/The movement framing still depends on the conceptspace/i)).toBeInTheDocument()
    })

    it('renders section CTA links with correct hrefs', () => {
      render(<MovementLandingPage />, { wrapper })
      const links = screen.getAllByRole('link')
      const organizeLink = links.find(l => l.getAttribute('href') === '/organize')
      const contentLink = links.find(l => l.getAttribute('href') === '/content')
      const projectsLink = links.find(l => l.getAttribute('href') === '/projects')
      const statementsLink = links.find(l => l.getAttribute('href') === '/statements')
      expect(organizeLink).toBeInTheDocument()
      expect(contentLink).toBeInTheDocument()
      expect(projectsLink).toBeInTheDocument()
      expect(statementsLink).toBeInTheDocument()
    })

    it('renders section eyebrows', () => {
      render(<MovementLandingPage />, { wrapper })
      expect(screen.getByText('Playbook')).toBeInTheDocument()
      expect(screen.getByText('Content')).toBeInTheDocument()
      expect(screen.getByText('Organize')).toBeInTheDocument()
      expect(screen.getByText('Theory')).toBeInTheDocument()
    })
  })
})
