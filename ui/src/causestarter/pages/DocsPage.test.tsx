import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DocsPage } from './DocsPage'

vi.mock('../components/ToolCard', () => ({
  ToolCard: () => null,
}))

function renderDocs(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/docs/*" element={<DocsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DocsPage', () => {
  it('renders the CauseStarter home guide', () => {
    renderDocs('/docs')
    expect(screen.getByTestId('docs-page')).toBeInTheDocument()
    expect(screen.getByText('CauseStarter')).toBeInTheDocument()
    expect(screen.getByText(/Do the part you’d do anyway/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Start a cause board/i })).toHaveAttribute(
      'href',
      '/docs/start-a-cause',
    )
    expect(screen.getByRole('link', { name: /Questions people actually ask/i })).toHaveAttribute(
      'href',
      '/docs/faq',
    )
  })

  it('renders the FAQ', () => {
    renderDocs('/docs/faq')
    expect(screen.getByRole('heading', { name: /Questions people actually ask/i })).toBeInTheDocument()
  })

  it('renders the eye-roll objections page', () => {
    renderDocs('/docs/why-this-isnt-lame')
    expect(screen.getByRole('heading', { name: /Why this isn’t lame/i })).toBeInTheDocument()
  })

  it('renders the jobs catalog', () => {
    renderDocs('/docs/the-jobs')
    expect(screen.getByRole('heading', { name: /Do the part you’d do anyway/i })).toBeInTheDocument()
    expect(screen.getByText('Money')).toBeInTheDocument()
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('opens vision-and-strategy from the bundled commonality tree', () => {
    renderDocs('/docs/vision-and-strategy')
    expect(screen.getByRole('heading', { name: /Why Commonality/i })).toBeInTheDocument()
  })
})
