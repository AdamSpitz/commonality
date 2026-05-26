import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { AlignmentLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<AlignmentLandingPage />} />
    <Route path="/explore" element={lazyRoute(() => import('../../conceptspace/pages/ExplorerPage'), 'ExplorerPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
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
      { label: 'Explore Causes', path: '/explore' },
      { label: 'Docs', path: '/docs' },
      { label: 'Delegation on LazyGiving', domain: 'lazyGiving', path: '/delegation/notes' },
      { label: 'Statements on Tally', domain: 'tally', path: '/statements' },
    ],
    secondaryNavigation: [
      { label: 'Set up delegation', domain: 'lazyGiving', path: '/delegation/notes/new' },
      { label: 'Open LazyGiving', domain: 'lazyGiving', path: '/' },
    ],
    footerText: 'Alignment helps donors fund causes through portals and transparent alignment attestations; delegation is managed from LazyGiving and Content Funding.',
  },
  features: {
    conceptspace: false,
    lazyGiving: false,
    fundingportal: true,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: AlignmentLandingPage,
}
