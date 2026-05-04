import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { TallyLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<TallyLandingPage />} />
    <Route path="/start" element={lazyRoute(() => import('../../conceptspace/pages/HomePage'), 'HomePage')} />
    <Route path="/explore" element={lazyRoute(() => import('../../conceptspace/pages/ExplorerPage'), 'ExplorerPage')} />
    <Route path="/statements" element={lazyRoute(() => import('../../conceptspace/pages/BrowseStatementsPage'), 'BrowseStatementsPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../conceptspace/pages/StatementPage'), 'StatementPage')} />
    <Route path="/profile" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/user/:address" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/settings" element={lazyRoute(() => import('../../conceptspace/pages/SettingsPage'), 'SettingsPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
  </>
)

export const tallyManifest: DomainManifest = {
  id: 'tally',
  branding: {
    name: 'Tally',
    tagline: 'Petitions and polls with an implication graph.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Start Signing', path: '/start' },
      { label: 'Explore', path: '/explore' },
      { label: 'Statements', path: '/statements' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'Trust & Nudger Settings', path: '/settings' },
    ],
    footerText: 'Tally helps people sign statements and see what public support adds up to.',
  },
  features: {
    conceptspace: true,
    pubstarter: false,
    fundingportal: true,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: TallyLandingPage,
}
