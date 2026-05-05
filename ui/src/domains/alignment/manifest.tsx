import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { AlignmentLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<AlignmentLandingPage />} />
    <Route path="/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
  </>
)

export const alignmentManifest: DomainManifest = {
  id: 'alignment',
  branding: {
    name: 'Alignment',
    tagline: 'Ongoing cause funding through trusted judgment.',
  },
  shell: {
    primaryNavigation: [
      { label: 'My Notes', path: '/notes' },
      { label: 'Create a Note', path: '/notes/new' },
      {
        label: 'Statements on Tally',
        get href() {
          return getDomainUrl('tally', '/statements', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      {
        label: 'Pledge funds to a cause',
        get href() {
          return getDomainUrl('commonality', '/docs/roles/pledge-to-a-cause', { fallbackHref: '#' })
        },
      },
      {
        label: 'Become a delegate',
        get href() {
          return getDomainUrl('commonality', '/docs/roles/become-a-delegate', { fallbackHref: '#' })
        },
      },
      {
        label: 'Open Pubstarter',
        get href() {
          return getDomainUrl('pubstarter', '/', { fallbackHref: '#' })
        },
      },
    ],
    footerText: 'Alignment helps donors route ongoing cause funding through delegates, portals, and transparent alignment attestations.',
  },
  features: {
    conceptspace: false,
    pubstarter: false,
    fundingportal: true,
    delegation: true,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: AlignmentLandingPage,
}
