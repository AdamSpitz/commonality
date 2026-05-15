import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CsmAboutPage, CsmNudgersPage, CsmOrganizingPage, CsmPopularStatementsPage } from './CsmPages'

describe('CSM movement pages', () => {
  describe('Popular statements page', () => {
    it('keeps the CSM-related statement list', () => {
      render(
        <MemoryRouter>
          <CsmPopularStatementsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /popular csm-related statements/i })).toBeInTheDocument()
      expect(screen.getByText(/most people are reasonable/i)).toBeInTheDocument()
      expect(screen.getByText(/political content that helps people disagree/i)).toBeInTheDocument()
    })

    it('signposts users to focused product sites instead of embedding product routes', () => {
      render(
        <MemoryRouter>
          <CsmPopularStatementsPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /use the focused products/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /go to civility/i })).toHaveAttribute('href', '#')
      expect(screen.getAllByRole('link', { name: /open tally statements/i })[0]).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: /go to alignment/i })).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: /go to pubstarter/i })).toHaveAttribute('href', '#')
    })
  })

  describe('Nudgers page', () => {
    it('keeps CSM nudger discovery', () => {
      render(
        <MemoryRouter>
          <CsmNudgersPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /csm nudgers/i })).toBeInTheDocument()
      expect(screen.getByText(/trusted services that suggest next statements/i)).toBeInTheDocument()
      expect(screen.getByText(/common sense majority bridge-builder nudger/i)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /configure on tally/i })).toHaveAttribute('href', '#')
    })

    it('uses the old organize route as a nudger-discovery alias', () => {
      render(
        <MemoryRouter>
          <CsmOrganizingPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /csm nudgers/i })).toBeInTheDocument()
    })
  })

  describe('About page', () => {
    it('renders the movement thesis content', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /about common sense majority/i })).toBeInTheDocument()
      expect(screen.getByText(/discover how many other people independently share your common-sense positions/i)).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /how signatures and support flow/i })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: /the 30-second pitch/i })).toBeInTheDocument()
    })

    it('explains that product workflows live elsewhere', () => {
      render(
        <MemoryRouter>
          <CsmAboutPage />
        </MemoryRouter>,
      )

      expect(screen.getByText(/csm links to those products instead of duplicating their routes/i)).toBeInTheDocument()
      const signposts = screen.getByRole('heading', { name: /use the focused products/i }).parentElement as HTMLElement
      expect(within(signposts).getByRole('link', { name: /go to civility/i })).toHaveAttribute('href', '#')
      expect(within(signposts).getByRole('link', { name: /go to alignment/i })).toHaveAttribute('href', '#')
    })
  })
})
