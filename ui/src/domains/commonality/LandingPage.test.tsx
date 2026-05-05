import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CommonalityLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

describe('CommonalityLandingPage', () => {
  it('renders the key landing-page ideas from the product spec', () => {
    render(<CommonalityLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1, name: "It's time for Internet-age public-goods-funding" })).toBeInTheDocument()
    expect(screen.getByText('Governments and big charity orgs both suck;')).toBeInTheDocument()
    expect(screen.getByText('New tech')).toBeInTheDocument()
    expect(screen.getByText('Internet, blockchains, and AI make a much better approach viable')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: 'For founders/organizers' })).toBeInTheDocument()
    expect(screen.getByText("it's easy to build a vertical on this substrate, here's how, here's some examples")).toBeInTheDocument()
  })
})
