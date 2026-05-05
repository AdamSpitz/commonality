import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentFundingLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

describe('ContentFundingLandingPage', () => {
  describe('hero section', () => {
    it('renders eyebrow', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByText('Content Funding')).toBeInTheDocument()
    })

    it('renders title as h1', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      const title = screen.getByRole('heading', { level: 1, name: 'Fund the content you want more of.' })
      expect(title).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByText(/Back articles, videos, posts, and channels/i)).toBeInTheDocument()
    })

    it('renders spotlight label as chip', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('How it works')
    })

    it('renders spotlight text', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByText(/Find a creator you want to support/i)).toBeInTheDocument()
      expect(screen.getByText(/Anyone who pledges gets refunded/i)).toBeInTheDocument()
    })

    it('renders hero action links with correct hrefs', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByRole('link', { name: 'Browse content' })).toHaveAttribute('href', '/content')
      expect(screen.getAllByRole('link', { name: 'How it works' })[0]).toHaveAttribute('href', '/about')
    })
  })

  describe('section cards', () => {
    it('renders all four section cards with titles', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 })
      const titles = sectionTitles.map(h => h.textContent)
      expect(titles).toContain('Find creators by platform')
      expect(titles).toContain('Start a funding contract')
      expect(titles).toContain('Run your creator workflow')
      expect(titles).toContain('How creator payouts work')
    })

    it('renders section descriptions', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByText(/Browse Twitter, YouTube, and Substack creators/i)).toBeInTheDocument()
      expect(screen.getByText(/reader, creator, and delegate flows/i)).toBeInTheDocument()
      expect(screen.getByText(/Create a contract around a channel/i)).toBeInTheDocument()
      expect(screen.getByText(/Creators can verify channels, collect escrowed funds/i)).toBeInTheDocument()
    })

    it('renders section CTA links with correct hrefs', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByRole('link', { name: 'Browse creators' })).toHaveAttribute('href', '/content/twitter')
      expect(screen.getByRole('link', { name: 'See supported platforms' })).toHaveAttribute('href', '/content')
      expect(screen.getByRole('link', { name: 'Open creator dashboard' })).toHaveAttribute('href', '/content/dashboard')
      expect(screen.getAllByRole('link', { name: 'How it works' })[1]).toHaveAttribute('href', '/about')
    })

    it('renders section eyebrows', () => {
      render(<ContentFundingLandingPage />, { wrapper })
      expect(screen.getByText('Browse')).toBeInTheDocument()
      expect(screen.getByText('Create')).toBeInTheDocument()
      expect(screen.getByText('Manage')).toBeInTheDocument()
      expect(screen.getByText('Learn')).toBeInTheDocument()
    })
  })
})
