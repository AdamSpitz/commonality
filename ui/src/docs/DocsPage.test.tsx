import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DocsPage } from './DocsPage'
import { BrowserRouter, useParams } from 'react-router-dom'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useParams: vi.fn(),
    Link: ({ to, children }: { to: string; children: React.ReactNode }) => (
      <a href={to}>{children}</a>
    ),
  }
})

const mockUseParams = vi.mocked(useParams)

function renderDocsPage() {
  return render(
    <BrowserRouter>
      <DocsPage />
    </BrowserRouter>,
  )
}

describe('DocsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows "Page not found" for non-existent doc paths', () => {
    mockUseParams.mockReturnValue({ '*': 'nonexistent-doc' })

    renderDocsPage()

    expect(screen.getByText('Page not found.')).toBeInTheDocument()
  })

  it('renders markdown headings as MUI Typography', () => {
    mockUseParams.mockReturnValue({ '*': 'index' })

    renderDocsPage()

    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
    const headingTexts = headings.map(h => h.textContent)
    expect(headingTexts).toContain('Commonality')
    expect(headingTexts).toContain('See it in action')
  })

  it('renders markdown paragraphs as body text', () => {
    mockUseParams.mockReturnValue({ '*': 'index' })

    renderDocsPage()

    const paragraphs = screen.getAllByRole('paragraph')
    expect(paragraphs.length).toBeGreaterThan(0)
    expect(screen.getByText(/Commonality is a movement/i)).toBeInTheDocument()
  })

  it('renders markdown lists', () => {
    mockUseParams.mockReturnValue({ '*': 'index' })

    renderDocsPage()

    const lists = screen.getAllByRole('list')
    expect(lists.length).toBeGreaterThan(0)
    expect(screen.getByText(/Supporting the kind of political writing/i)).toBeInTheDocument()
  })

  it('renders internal doc links as router links', () => {
    mockUseParams.mockReturnValue({ '*': 'index' })

    renderDocsPage()

    const links = screen.getAllByRole('link')
    const internalLinks = links.filter(link => {
      const href = link.getAttribute('href')
      return href?.startsWith('/docs/') || href?.startsWith('#')
    })
    expect(internalLinks.length).toBeGreaterThan(0)
    const hrefs = internalLinks.map(l => l.getAttribute('href'))
    expect(hrefs).toContain('/docs/use-case-walkthroughs/noninflammatory-content')
    expect(hrefs).toContain('/docs/use-case-walkthroughs/common-sense-majority')
  })

  it('renders inline code elements', () => {
    mockUseParams.mockReturnValue({ '*': 'for-crypto-natives' })

    const { container } = renderDocsPage()

    const codeElements = container.querySelectorAll('code')
    expect(codeElements.length).toBeGreaterThan(0)
    const codeTexts = Array.from(codeElements).map(c => c.textContent)
    expect(codeTexts.some(t => t?.includes('cast') || t?.includes('ethers'))).toBe(true)
  })

  it('renders key-ideas docs', () => {
    mockUseParams.mockReturnValue({ '*': 'key-ideas/statements-and-implication-graph' })

    renderDocsPage()

    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
  })

  it('renders use-case-walkthroughs docs', () => {
    mockUseParams.mockReturnValue({ '*': 'use-case-walkthroughs/block-party' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders role docs from their site homes', () => {
    mockUseParams.mockReturnValue({ '*': 'pubstarter/fund-something' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('redirects legacy /roles/* URLs to their new site homes', () => {
    mockUseParams.mockReturnValue({ '*': 'roles/fund-something' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders README docs in subdirectories', () => {
    mockUseParams.mockReturnValue({ '*': 'key-ideas/README' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
  })

  it('renders for-crypto-natives doc', () => {
    mockUseParams.mockReturnValue({ '*': 'for-crypto-natives' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders why-trust-it doc', () => {
    mockUseParams.mockReturnValue({ '*': 'why-trust-it' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    const headings = screen.getAllByRole('heading')
    expect(headings.length).toBeGreaterThan(0)
  })

  it('renders vision-and-strategy docs linked from the Commonality index', () => {
    mockUseParams.mockReturnValue({ '*': 'vision-and-strategy' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /why commonality/i })).toBeInTheDocument()
  })

  it('renders Common Sense Majority docs', () => {
    mockUseParams.mockReturnValue({ '*': 'common-sense-majority' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /common sense majority/i })).toBeInTheDocument()
  })

  it('resolves relative links from README docs in subdirectories', () => {
    mockUseParams.mockReturnValue({ '*': 'vision-and-strategy' })

    renderDocsPage()

    expect(screen.getByRole('link', { name: 'Yes' })).toHaveAttribute(
      'href',
      '/docs/vision-and-strategy/credible-solution',
    )
  })

  it('normalizes absolute /docs markdown links', () => {
    mockUseParams.mockReturnValue({ '*': 'vision-and-strategy' })

    renderDocsPage()

    for (const link of screen.getAllByRole('link', { name: 'walkthrough' })) {
      expect(link).toHaveAttribute('href', '/docs/use-case-walkthroughs/defunding')
    }
  })

  it('renders Conceptspace developer docs', () => {
    mockUseParams.mockReturnValue({ '*': 'conceptspace' })

    renderDocsPage()

    expect(screen.queryByText('Page not found.')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /conceptspace developer docs/i })).toBeInTheDocument()
    expect(screen.getByText(/generated TypeScript SDK reference/i)).toBeInTheDocument()
  })

  it('has constrained max width for readability', () => {
    mockUseParams.mockReturnValue({ '*': 'index' })

    const { container } = renderDocsPage()

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveStyle('max-width: 720px')
  })
})
