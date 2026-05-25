import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CsmLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

function expectLinkToHref(href: string) {
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === href)).toBe(true)
}

describe('CsmLandingPage', () => {
  it('renders a landing page with the expected CSM destinations', () => {
    render(<CsmLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/\S/)
    expectLinkToHref('/popular-statements')
    expectLinkToHref('/organize')
    expectLinkToHref('/about')
  })
})
