import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { CommonalityLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<CommonalityLandingPage />} />
    <Route path="/projects" element={lazyRoute(() => import('../../pubstarter/pages/BrowseProjectsPage'), 'BrowseProjectsPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('../../pubstarter/pages/CreateProjectPage'), 'CreateProjectPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('../../pubstarter/pages/ProjectDetailPage'), 'ProjectDetailPage')} />
    <Route path="/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const commonalityManifest: DomainManifest = {
  id: 'commonality',
  branding: {
    name: 'Commonality',
    tagline: 'Internet-age coordination for public goods.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Start Here', path: '/docs' },
      { label: 'Projects', path: '/projects' },
      { label: 'Start a Project', path: '/projects/new' },
      { label: 'Delegated Funds', path: '/notes' },
    ],
    secondaryNavigation: [
      { label: 'New Delegated Fund', path: '/notes/new' },
    ],
    footerText: 'Commonality is a movement for better public-goods funding and the infrastructure to make it practical.',
  },
  features: {
    conceptspace: false,
    pubstarter: true,
    fundingportal: true,
    delegation: true,
    mutablerefs: false,
    contentFunding: false,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: CommonalityLandingPage,
}
