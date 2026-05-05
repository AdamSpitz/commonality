import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CsmLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

describe('CsmLandingPage', () => {
  it('renders the key landing-page ideas from the product spec', () => {
    render(<CsmLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1, name: 'Giving the quiet middle majority a voice' })).toBeInTheDocument()
    expect(screen.getByText('On most issues, the loud extremes dominate, while a quiet supermajority holds common-sense positions that never get heard')).toBeInTheDocument()
    expect(screen.getByText('Build bridges')).toBeInTheDocument()
    expect(screen.getByText('Sign statements in your own words; the other side does the same; AI helps find overlap; noninflammatory content nudges people toward common ground')).toBeInTheDocument()
    expect(screen.getByText('Build momentum')).toBeInTheDocument()
    expect(screen.getByText('Transparent, verifiable supporter counts and funding flows to demonstrate the size of the movement')).toBeInTheDocument()
    expect(screen.getByText('Credible neutrality')).toBeInTheDocument()
    expect(screen.getByText('The infrastructure is verifiably neutral, *not* capturable by either side')).toBeInTheDocument()
  })
})
