import React from 'react'
import { render, screen } from '@testing-library/react'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetActiveDomain = vi.fn()

vi.mock('./domains', () => ({
  getActiveDomain: () => mockGetActiveDomain(),
}))

vi.mock('./shared/routing/routing', () => ({
  isHashRouting: () => false,
}))

vi.mock('./shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div>
      <nav>Navigation</nav>
      <main>{children}</main>
      <footer>Footer</footer>
    </div>
  ),
}))

function fakeDomain() {
  return {
    id: 'commonality',
    branding: { name: 'Commonality', tagline: 'tagline' },
    shell: {
      primaryNavigation: [],
      secondaryNavigation: [],
      footerText: 'footer',
    },
    features: {},
    basePath: '/',
    routes: <Route path="/" element={<div>Home route</div>} />,
  }
}

describe('App unknown routes', () => {
  beforeEach(() => {
    mockGetActiveDomain.mockReturnValue(fakeDomain())
    window.history.pushState({}, '', '/')
  })

  it('renders a not-found page instead of a blank shell for undefined routes', async () => {
    window.history.pushState({}, '', '/nonexistent-route')

    const { default: App } = await import('./App')
    render(<App />)

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go home/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /browse creators/i })).toHaveAttribute('href', '/content')
  })
})
