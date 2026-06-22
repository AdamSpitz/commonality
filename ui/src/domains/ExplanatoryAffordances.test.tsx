import type { ReactElement } from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AlignmentLandingPage } from './alignment/LandingPage'
import { TallyLandingPage } from './tally/LandingPage'

function renderDomainLanding(page: ReactElement) {
  render(<MemoryRouter>{page}</MemoryRouter>)
}

describe('domain landing explanatory affordances', () => {
  describe('Tally', () => {
    it('explains indirect counts as conservative implication-derived support, not magic totals', () => {
      renderDomainLanding(<TallyLandingPage />)

      expect(screen.getByRole('heading', { name: /how does counting indirect support work/i })).toBeInTheDocument()
      expect(screen.getByText(/people sign statements in their own words/i)).toBeInTheDocument()
      expect(screen.getByText(/ai implication service finds statements that clearly imply each other/i)).toBeInTheDocument()
      expect(screen.getByText(/it is deliberately strict/i)).toBeInTheDocument()
      expect(screen.getByText(/find genuine overlap, not manufacture it/i)).toBeInTheDocument()
    })

    it('tells users they can choose which implication sources to trust', () => {
      renderDomainLanding(<TallyLandingPage />)

      expect(screen.getByRole('heading', { name: /don't trust our implication service/i })).toBeInTheDocument()
      expect(screen.getByText(/anyone can run their own implication attester/i)).toBeInTheDocument()
      expect(screen.getByText(/users can choose to trust whichever one\(s\) they prefer/i)).toBeInTheDocument()
      expect(screen.getByText(/anyone can contribute to or verify/i)).toBeInTheDocument()
    })
  })

  describe('Aligning', () => {
    it('distinguishes delegated giving from direct project picking', () => {
      renderDomainLanding(<AlignmentLandingPage />)

      expect(screen.getByRole('heading', { name: /hand your giving to a friend/i })).toBeInTheDocument()
      expect(screen.getByText(/delegate to a friend instead/i)).toBeInTheDocument()
      expect(screen.getByText(/prefer the hands-on path/i)).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /explore causes/i }).some((link) => link.getAttribute('href') === '/explore')).toBe(true)
    })

    it('explains why cause boards include differently worded but related causes', () => {
      renderDomainLanding(<AlignmentLandingPage />)

      expect(screen.getByRole('heading', { name: /causes don't need exact wording/i })).toBeInTheDocument()
      expect(screen.getByText(/a cause is just a Conceptspace statement/i)).toBeInTheDocument()
      expect(screen.getByText(/implication graph connects statements that mean similar things/i)).toBeInTheDocument()
      expect(screen.getByText(/curated by your trust network, not a gatekeeper/i)).toBeInTheDocument()
    })
  })
})
