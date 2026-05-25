import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CommonalityLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

function expectLinkToHref(href: string) {
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === href)).toBe(true)
}

describe('CommonalityLandingPage', () => {
  it('renders a landing page with the expected movement destinations', () => {
    render(<CommonalityLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/\S/)
    expectLinkToHref('/docs')
    expectLinkToHref('/founders')
    expectLinkToHref('/participate')
  })
})
