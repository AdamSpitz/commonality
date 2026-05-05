import React from 'react'
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
      expect(screen.getByRole('heading', { level: 1, name: /movement for funding what we actually need/i })).toBeInTheDocument()
      expect(screen.getByText(/remarkably bad at producing the things we collectively need/i)).toBeInTheDocument()
    })

    it('keeps hero actions focused on thesis and founder pitch', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('link', { name: 'Read the thesis' })).toHaveAttribute('href', '/docs/vision-and-strategy')
      expect(screen.getByRole('link', { name: 'Founder / organizer pitch' })).toHaveAttribute('href', '/founders')
      expect(screen.getAllByRole('link').filter((link) => link.closest('.MuiPaper-root')?.textContent?.includes('The thesis')).length).toBeLessThanOrEqual(2)
    })
  })

  describe('section cards', () => {
    it('renders the movement-thesis sections', () => {
      render(<CommonalityLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 }).map(h => h.textContent)
      expect(sectionTitles).toContain('Public goods are badly underproduced')
      expect(sectionTitles).toContain('Keep individual choices intact longer')
      expect(sectionTitles).toContain('Each step is useful on its own')
    })

    it('links to founder/user docs instead of local product tools', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('link', { name: 'Read why this matters' })).toHaveAttribute('href', '/docs/vision-and-strategy/so-what')
      expect(screen.getByRole('link', { name: 'See why it is better' })).toHaveAttribute('href', '/docs/vision-and-strategy/why-its-better/individualization')
      expect(screen.getByRole('link', { name: 'Explore adoption paths' })).toHaveAttribute('href', '/docs/vision-and-strategy/ease-of-adoption')
    })
  })

  describe('product-site links', () => {
    it('renders product links below the movement pitch', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getByRole('heading', { level: 5, name: 'The product sites' })).toBeInTheDocument()
      expect(screen.getAllByText('Pubstarter').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Alignment').length).toBeGreaterThan(0)
      expect(screen.getByText('Tally')).toBeInTheDocument()
      expect(screen.getByText('Content Funding')).toBeInTheDocument()
      expect(screen.getByText('Noninflammatory Content')).toBeInTheDocument()
      expect(screen.getByText('Common Sense Majority')).toBeInTheDocument()
    })

    it('uses placeholder hrefs for sibling domains when URLs are not configured', () => {
      render(<CommonalityLandingPage />, { wrapper })
      expect(screen.getAllByRole('link', { name: 'Open Pubstarter' })[0]).toHaveAttribute('href', '#')
      expect(screen.getAllByRole('link', { name: 'Open Alignment' })[0]).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: 'Open Tally' })).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: 'Open Content Funding' })).toHaveAttribute('href', '#')
    })
  })
})
