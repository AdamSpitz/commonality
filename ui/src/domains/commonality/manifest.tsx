import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { CommonalityLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<CommonalityLandingPage />} />
    <Route path="/start" element={lazyRoute(() => import('../../conceptspace/pages/HomePage'), 'HomePage')} />
    <Route path="/explore" element={lazyRoute(() => import('../../conceptspace/pages/ExplorerPage'), 'ExplorerPage')} />
    <Route path="/statements" element={lazyRoute(() => import('../../conceptspace/pages/BrowseStatementsPage'), 'BrowseStatementsPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../conceptspace/pages/StatementPage'), 'StatementPage')} />
    <Route path="/profile" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/user/:address" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/settings" element={lazyRoute(() => import('../../conceptspace/pages/SettingsPage'), 'SettingsPage')} />
    <Route path="/projects" element={lazyRoute(() => import('../../pubstarter/pages/BrowseProjectsPage'), 'BrowseProjectsPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('../../pubstarter/pages/CreateProjectPage'), 'CreateProjectPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('../../pubstarter/pages/ProjectDetailPage'), 'ProjectDetailPage')} />
    <Route path="/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
    <Route path="/refs" element={lazyRoute(() => import('../../mutablerefs'), 'MyRefsPage')} />
    <Route path="/content" element={lazyRoute(() => import('../../content-funding/pages/CreatorsLandingPage'), 'CreatorsLandingPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('../../content-funding/pages/BrowseCreatorsPage'), 'BrowseCreatorsPage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('../../content-funding/pages/ChannelPage'), 'ChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('../../content-funding/pages/CreateContractPage'), 'CreateContractPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('../../content-funding/pages/CreatorDashboardPage'), 'CreatorDashboardPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const commonalityManifest: DomainManifest = {
  id: 'commonality',
  branding: {
    name: 'Commonality',
    tagline: 'Find common ground and fund what matters.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Start Here', path: '/docs' },
      { label: 'Explore', path: '/explore' },
      { label: 'Statements', path: '/statements' },
      { label: 'Projects', path: '/projects' },
      { label: 'Creators', path: '/content' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'My Delegated Funds', path: '/notes' },
      { label: 'My Trust Network', path: '/settings' },
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'Saved Refs', path: '/refs' },
    ],
    footerText: 'Commonality helps people fund projects and content around shared values.',
  },
  features: {
    conceptspace: true,
    pubstarter: true,
    fundingportal: true,
    delegation: true,
    mutablerefs: true,
    contentFunding: true,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: CommonalityLandingPage,
}
