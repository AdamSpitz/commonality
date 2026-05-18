import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentFundingLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

describe('ContentFundingLandingPage', () => {
  it('renders the key landing-page ideas from the product spec', () => {
    render(<ContentFundingLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1, name: 'Fund the kind of social-media content you want to see' })).toBeInTheDocument()
    expect(screen.getByText('Fund creators, channels, and specific pieces of work on mainstream social platforms.')).toBeInTheDocument()
    expect(screen.getByText('Base funding on criteria other than eyeballs')).toBeInTheDocument()
    expect(screen.getByText('Reward posts, videos, essays, and channels directly, instead of relying on ad incentives that reward clickbait and outrage')).toBeInTheDocument()
    expect(screen.getByText('Works with mainstream social media')).toBeInTheDocument()
    expect(screen.getByText("Works with X, YouTube, and Substack — fund creators you like even if they haven't registered here yet")).toBeInTheDocument()
  })
})
