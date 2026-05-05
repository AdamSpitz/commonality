import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { NoninflammatoryLandingPage } from './LandingPage'

const wrapper = ({ children }: { children: React.ReactNode }) => <MemoryRouter>{children}</MemoryRouter>

describe('NoninflammatoryLandingPage', () => {
  it('renders the key landing-page ideas from the product spec', () => {
    render(<NoninflammatoryLandingPage />, { wrapper })

    expect(screen.getByRole('heading', { level: 1, name: 'Fund civility' })).toBeInTheDocument()
    expect(screen.getByText("Let's reward noninflammatory content")).toBeInTheDocument()
    expect(screen.getByText('Each side gets to say what they find inflammatory')).toBeInTheDocument()
    expect(screen.getByText('Identify and fund content that passes your own side\'s - or the other side\'s - "will this content *not* piss me off?" filter')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: "Want to find out when your own side is lying to you, but can't stomach following the other side's bullshit?" })).toBeInTheDocument()
    expect(screen.getByText('Get recommendations vetted by *your* side, for noninflammatory content from the *other* side')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 6, name: "Want your side's ideas to actually reach the other side?" })).toBeInTheDocument()
    expect(screen.getByText('Fund the messengers who know how to deliver them')).toBeInTheDocument()
    expect(screen.getByText("AI does the filtering so you don't have to")).toBeInTheDocument()
  })
})
