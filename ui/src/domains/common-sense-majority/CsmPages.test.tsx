import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { CsmAboutPage, CsmBridgesPage, CsmNudgersPage, CsmOrganizingPage, CsmPopularStatementsPage } from './CsmPages'
import { buildCompleteBridgeCards, type BridgeAnchorRecord } from './csmBridges'

describe('CSM movement pages', () => {
  describe('Bridges page', () => {
    it('renders the suggested-bridge framing and featured bridge cards', () => {
      render(
        <MemoryRouter>
          <CsmBridgesPage />
        </MemoryRouter>,
      )

      expect(screen.getByRole('heading', { name: /common ground bridges/i })).toBeInTheDocument()
      expect(screen.getByText(/ai-synthesized suggested bridges, not poll results/i)).toBeInTheDocument()
      expect(screen.getByText(/abortion should be available at least through the first trimester/i)).toBeInTheDocument()
      expect(screen.getByText(/i'm uncomfortable with abortion/i)).toBeInTheDocument()
      expect(screen.getByText(/early-term abortion should be available/i)).toBeInTheDocument()
      expect(screen.getAllByRole('link', { name: /sign your version on tally/i })[0]).toHaveAttribute('href', '#')
    })

    it('filters bridge cards by derived topic chips', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter>
          <CsmBridgesPage />
        </MemoryRouter>,
      )

      await user.click(screen.getByRole('button', { name: /immigration/i }))

      expect(screen.getByText(/deport illegal immigrants who are also criminals/i)).toBeInTheDocument()
      expect(screen.queryByText(/early-term abortion should be available/i)).not.toBeInTheDocument()
    })

    it('does not build cards for incomplete clusters', () => {
      const baseAnchor: BridgeAnchorRecord = {
        id: 'test-left',
        cluster_id: 'test-cluster',
        role: 'moderate-left',
        text: 'Left text',
        tally_cid: null,
        topic_tag: 'test-topic',
        rationale: 'Test rationale',
        status: 'active',
        featured: true,
        created_at: '2026-01-01T00:00:00.000Z',
        last_reviewed_at: '2026-01-01T00:00:00.000Z',
      }

      expect(buildCompleteBridgeCards([baseAnchor, { ...baseAnchor, id: 'test-common', role: 'common-ground', text: 'Common text' }])).toEqual([])
    })
  })

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
      expect(screen.getByRole('link', { name: /go to aligning/i })).toHaveAttribute('href', '#')
      expect(screen.getByRole('link', { name: /go to lazyGiving/i })).toHaveAttribute('href', '#')
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
      expect(within(signposts).getByRole('link', { name: /open tally statements/i })).toHaveAttribute('href', '#')
      expect(within(signposts).getByRole('link', { name: /go to aligning/i })).toHaveAttribute('href', '#')
      expect(within(signposts).getByRole('link', { name: /go to lazyGiving/i })).toHaveAttribute('href', '#')
    })
  })
})
