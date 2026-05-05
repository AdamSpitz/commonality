import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DomainLandingPage } from './DomainLandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
)

const defaultProps = {
  eyebrow: 'Test Domain',
  title: 'Welcome to Test Domain',
  description: 'This is a test domain landing page.',
  heroActions: [
    { label: 'Get Started', path: '/start', variant: 'contained' as const },
    { label: 'Learn More', path: '/about', variant: 'outlined' as const },
  ],
  sections: [
    { title: 'Browse', description: 'Browse content', path: '/browse', cta: 'Browse Now' },
    { title: 'Create', description: 'Create content', path: '/create', cta: 'Create' },
    { title: 'Manage', description: 'Manage your content', path: '/manage', cta: 'Manage' },
  ],
}

describe('DomainLandingPage', () => {
  describe('hero section', () => {
    it('renders eyebrow text', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      expect(screen.getByText('Test Domain')).toBeInTheDocument()
    })

    it('renders title as h1', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      const title = screen.getByRole('heading', { level: 1, name: 'Welcome to Test Domain' })
      expect(title).toBeInTheDocument()
    })

    it('renders description', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      expect(screen.getByText('This is a test domain landing page.')).toBeInTheDocument()
    })

    it('renders hero action buttons as links', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      expect(screen.getByRole('link', { name: 'Get Started' })).toHaveAttribute('href', '/start')
      expect(screen.getByRole('link', { name: 'Learn More' })).toHaveAttribute('href', '/about')
    })

    it('renders external hero action buttons as anchors', () => {
      render(
        <DomainLandingPage
          {...defaultProps}
          heroActions={[{ label: 'Open Tally', href: 'https://tally.example/statements' }]}
        />,
        { wrapper },
      )
      expect(screen.getByRole('link', { name: 'Open Tally' })).toHaveAttribute('href', 'https://tally.example/statements')
    })
  })

  describe('spotlight section', () => {
    it('does not render spotlight when spotlightText is not provided', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      expect(screen.queryByRole('chip')).not.toBeInTheDocument()
    })

    it('renders spotlight text when provided', () => {
      render(<DomainLandingPage {...defaultProps} spotlightText="Featured: New content available" />, { wrapper })
      expect(screen.getByText('Featured: New content available')).toBeInTheDocument()
    })

    it('renders spotlight label as a chip when provided', () => {
      render(
        <DomainLandingPage
          {...defaultProps}
          spotlightLabel="Featured"
          spotlightText="New content available"
        />,
        { wrapper }
      )
      const chip = document.querySelector('.MuiChip-label')
      expect(chip).toHaveTextContent('Featured')
    })

    it('renders spotlight text without chip when only spotlightText is provided', () => {
      render(<DomainLandingPage {...defaultProps} spotlightText="Just text" />, { wrapper })
      expect(screen.queryByRole('chip')).not.toBeInTheDocument()
      expect(screen.getByText('Just text')).toBeInTheDocument()
    })
  })

  describe('section cards', () => {
    it('renders all section cards with title and description', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      const sectionTitles = screen.getAllByRole('heading', { level: 6 })
      const sectionTexts = sectionTitles.map(h => h.textContent)
      expect(sectionTexts).toContain('Browse')
      expect(sectionTexts).toContain('Create')
      expect(sectionTexts).toContain('Manage')
      expect(screen.getByText('Browse content')).toBeInTheDocument()
      expect(screen.getByText('Create content')).toBeInTheDocument()
      expect(screen.getByText('Manage your content')).toBeInTheDocument()
    })

    it('renders section CTA buttons as links', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      expect(screen.getByRole('link', { name: 'Browse Now' })).toHaveAttribute('href', '/browse')
      expect(screen.getByRole('link', { name: 'Create' })).toHaveAttribute('href', '/create')
      expect(screen.getByRole('link', { name: 'Manage' })).toHaveAttribute('href', '/manage')
    })

    it('renders external section CTA buttons as anchors', () => {
      const sections = [
        { title: 'Tally', description: 'Statement signing', href: 'https://tally.example', cta: 'Open Tally' },
      ]
      render(<DomainLandingPage {...defaultProps} sections={sections} />, { wrapper })
      expect(screen.getByRole('link', { name: 'Open Tally' })).toHaveAttribute('href', 'https://tally.example')
    })

    it('renders section eyebrow when provided', () => {
      const sections = [
        { title: 'Browse', description: 'Browse content', path: '/browse', cta: 'Browse Now', eyebrow: 'Explore' },
      ]
      render(<DomainLandingPage {...defaultProps} sections={sections} />, { wrapper })
      expect(screen.getByText('Explore')).toBeInTheDocument()
    })

    it('does not render eyebrow when not provided', () => {
      render(<DomainLandingPage {...defaultProps} />, { wrapper })
      const sectionCards = screen.getAllByRole('heading', { level: 6 })
      sectionCards.forEach(card => {
        expect(card).not.toHaveTextContent('')
      })
    })
  })

  describe('children', () => {
    it('renders children below sections', () => {
      render(
        <DomainLandingPage {...defaultProps}>
          <div data-testid="custom-content">Extra content</div>
        </DomainLandingPage>,
        { wrapper }
      )
      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
      expect(screen.getByText('Extra content')).toBeInTheDocument()
    })

    it('does not render extra container when no children provided', () => {
      const { container } = render(<DomainLandingPage {...defaultProps} />, { wrapper })
      const boxes = container.querySelectorAll('[style*="margin-top"]')
      expect(boxes.length).toBe(0)
    })
  })

  describe('hero action variants', () => {
    it('defaults to contained variant when not specified', () => {
      const actions = [{ label: 'Default', path: '/default' }]
      render(<DomainLandingPage {...defaultProps} heroActions={actions} />, { wrapper })
      const link = screen.getByRole('link', { name: 'Default' })
      expect(link).toBeInTheDocument()
    })

    it('renders multiple hero actions in a row', () => {
      const actions = [
        { label: 'Primary', path: '/primary', variant: 'contained' as const },
        { label: 'Secondary', path: '/secondary', variant: 'outlined' as const },
        { label: 'Tertiary', path: '/tertiary', variant: 'text' as const },
      ]
      render(<DomainLandingPage {...defaultProps} heroActions={actions} />, { wrapper })
      expect(screen.getByRole('link', { name: 'Primary' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Secondary' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Tertiary' })).toBeInTheDocument()
    })
  })

  describe('empty states', () => {
    it('renders with no hero actions', () => {
      render(<DomainLandingPage {...defaultProps} heroActions={[]} />, { wrapper })
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('renders with no sections', () => {
      render(<DomainLandingPage {...defaultProps} sections={[]} />, { wrapper })
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })
})
