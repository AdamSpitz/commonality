import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CreatorsLandingPage } from './CreatorsLandingPage'

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={to} {...props}>{children}</a>
  ),
}))

describe('CreatorsLandingPage', () => {
  it('renders default title', () => {
    render(<CreatorsLandingPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Creators' })).toBeInTheDocument()
  })

  it('renders custom title', () => {
    render(<CreatorsLandingPage title="My Creators" />)
    expect(screen.getByRole('heading', { level: 1, name: 'My Creators' })).toBeInTheDocument()
  })

  it('renders default description', () => {
    render(<CreatorsLandingPage />)
    expect(screen.getByText(/Any piece of content with a URL/i)).toBeInTheDocument()
  })

  it('renders custom description', () => {
    render(<CreatorsLandingPage description="Custom description" />)
    expect(screen.getByText('Custom description')).toBeInTheDocument()
  })

  it('renders secondary description', () => {
    render(<CreatorsLandingPage />)
    expect(screen.getByText(/If you're a creator, claim your channel/i)).toBeInTheDocument()
  })

  it('renders custom secondary description', () => {
    render(<CreatorsLandingPage secondaryDescription="Custom secondary" />)
    expect(screen.getByText('Custom secondary')).toBeInTheDocument()
  })

  it('renders Twitter/X platform card with link', () => {
    render(<CreatorsLandingPage />)
    expect(screen.getByText('Twitter / X')).toBeInTheDocument()
    expect(screen.getByText('Fund tweets, threads, and creators posting on Twitter.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Twitter \/ X/i })
    expect(link).toHaveAttribute('href', '/content/twitter')
  })

  it('renders YouTube platform card with link', () => {
    render(<CreatorsLandingPage />)
    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('Fund videos and channels producing content you value.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /YouTube/i })
    expect(link).toHaveAttribute('href', '/content/youtube')
  })

  it('renders Substack platform card with link', () => {
    render(<CreatorsLandingPage />)
    expect(screen.getByText('Substack')).toBeInTheDocument()
    expect(screen.getByText('Fund newsletters and writers publishing on Substack.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Substack/i })
    expect(link).toHaveAttribute('href', '/content/substack')
  })

  it('renders learn more link with default label and path', () => {
    render(<CreatorsLandingPage />)
    const link = screen.getByRole('link', { name: 'Learn how content funding works' })
    expect(link).toHaveAttribute('href', '/docs/key-ideas/content-funding')
  })

  it('renders custom learn more label and path', () => {
    render(<CreatorsLandingPage learnMoreLabel="Custom learn more" learnMorePath="/custom-path" />)
    const link = screen.getByRole('link', { name: 'Custom learn more' })
    expect(link).toHaveAttribute('href', '/custom-path')
  })

  it('platform cards are clickable and navigate correctly', async () => {
    render(<CreatorsLandingPage />)
    const user = userEvent.setup()
    const twitterLink = screen.getByRole('link', { name: /Twitter \/ X/i })
    await user.click(twitterLink)
    expect(twitterLink).toHaveAttribute('href', '/content/twitter')
  })

  it('renders all three platform cards', () => {
    render(<CreatorsLandingPage />)
    const cards = screen.getAllByRole('link')
    const platformLinks = cards.filter((link) =>
      link.getAttribute('href')?.startsWith('/content/')
    )
    expect(platformLinks).toHaveLength(3)
  })

  it('has h1 heading for accessibility', () => {
    render(<CreatorsLandingPage />)
    const headings = screen.getAllByRole('heading')
    const h1 = headings.find((h) => h.tagName === 'H1')
    expect(h1).toBeInTheDocument()
  })

  it('platform cards have h6 headings', () => {
    render(<CreatorsLandingPage />)
    const h6Headings = screen.getAllByRole('heading', { level: 6 })
    expect(h6Headings).toHaveLength(3)
    expect(h6Headings[0]).toHaveTextContent('Twitter / X')
    expect(h6Headings[1]).toHaveTextContent('YouTube')
    expect(h6Headings[2]).toHaveTextContent('Substack')
  })
})
