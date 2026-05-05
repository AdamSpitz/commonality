import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NoninflammatoryLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('NoninflammatoryLandingPage', () => {
  describe('hero section', () => {
    it('renders eyebrow', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      expect(screen.getByText('Civility')).toBeInTheDocument()
    })

    it('renders title as h1', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      const title = screen.getByRole('heading', { level: 1, name: /Reward content that lowers the temperature/i })
      expect(title).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      expect(screen.getByText(/Most political content is designed to make you angry/i)).toBeInTheDocument()
    })

    it('renders spotlight label as chip', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('What noninflammatory means')
    })

    it('renders spotlight text', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      expect(screen.getByText(/A noninflammatory piece argues a position clearly and forcefully/i)).toBeInTheDocument()
    })

    it('renders hero and section action links with correct hrefs', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      const links = screen.getAllByRole('link')
      const hrefs = links.map(l => l.getAttribute('href'))
      expect(hrefs).toContain('/content')
      expect(hrefs).toContain('/content/dashboard')
      expect(hrefs).toContain('#')
    })
  })

  describe('section cards', () => {
    it('renders all three section cards with titles', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 })
      const titles = sectionTitles.map(h => h.textContent)
      expect(titles).toContain('See bridge-building content')
      expect(titles).toContain('Get paid for bridge-building work')
      expect(titles).toContain('Sign the statements behind the content')
    })

    it('renders section descriptions', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      expect(screen.getByText(/Browse funded content across platforms/i)).toBeInTheDocument()
      expect(screen.getByText(/Creators can verify channels, create contracts/i)).toBeInTheDocument()
      expect(screen.getByText(/Want to put your name behind the positions/i)).toBeInTheDocument()
    })

    it('renders section CTA links with correct hrefs', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      const links = screen.getAllByRole('link')
      const contentLink = links.find(l => l.getAttribute('href') === '/content')
      const dashboardLink = links.find(l => l.getAttribute('href') === '/content/dashboard')
      const statementsLink = links.find(l => l.textContent === 'Explore statements on Tally' && l.getAttribute('href') === '#')
      expect(contentLink).toBeInTheDocument()
      expect(dashboardLink).toBeInTheDocument()
      expect(statementsLink).toBeInTheDocument()
    })

    it('renders section eyebrows', () => {
      render(<NoninflammatoryLandingPage />, { wrapper })
      expect(screen.getByText('Browse')).toBeInTheDocument()
      expect(screen.getByText('Create')).toBeInTheDocument()
      expect(screen.getByText('Tally')).toBeInTheDocument()
    })
  })
})
