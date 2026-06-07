import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentFundingLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

function expectLinkToHref(href: string) {
  expect(screen.getAllByRole('link').some(link => link.getAttribute('href') === href)).toBe(true)
}

describe('ContentFundingLandingPage', () => {
  it('renders a landing page with the expected content-funding destinations', () => {
    render(<ContentFundingLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/\S/)
    expectLinkToHref('/content')
    expectLinkToHref('/content/dashboard')
    expectLinkToHref('/explore')
  })
})
