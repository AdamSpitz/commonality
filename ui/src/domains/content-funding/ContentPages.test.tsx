import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { ContentFundingCreatorsPage } from './ContentPages'

describe('Content Funding branded surfaces', () => {
  it('renders the content-funding specific wrapper copy', () => {
    render(
      <MemoryRouter>
        <ContentFundingCreatorsPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /content funding/i })).toBeInTheDocument()
    expect(
      screen.getByText(/this surface stays focused on discoverability, funding, and creator payouts/i)
    ).toBeInTheDocument()
  })
})
