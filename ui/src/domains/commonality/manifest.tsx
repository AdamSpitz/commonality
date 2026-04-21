import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { CommonalityLandingPage } from './LandingPage'
import { HomePage } from '../../conceptspace/pages/HomePage'
import { BrowseStatementsPage } from '../../conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from '../../conceptspace/pages/StatementPage'
import { UserProfilePage } from '../../conceptspace/pages/UserProfilePage'
import { SettingsPage } from '../../conceptspace/pages/SettingsPage'
import { ExplorerPage } from '../../conceptspace/pages/ExplorerPage'
import { BrowseProjectsPage } from '../../pubstarter/pages/BrowseProjectsPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'
import { CreateProjectPage } from '../../pubstarter/pages/CreateProjectPage'
import { MyNotesPage, NoteDetailPage, DepositPage } from '../../delegation/pages'
import { StatementFundingPortalPage, CauseLeaderboardPage } from '../../fundingportal/pages'
import { MyRefsPage } from '../../mutablerefs'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { DocsPage } from '../../docs/DocsPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<CommonalityLandingPage />} />
    <Route path="/start" element={<HomePage />} />
    <Route path="/explore" element={<ExplorerPage />} />
    <Route path="/statements" element={<BrowseStatementsPage />} />
    <Route path="/statement/:statementCid" element={<StatementPage />} />
    <Route path="/profile" element={<UserProfilePage />} />
    <Route path="/user/:address" element={<UserProfilePage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="/projects" element={<BrowseProjectsPage />} />
    <Route path="/projects/new" element={<CreateProjectPage />} />
    <Route path="/projects/:projectAddress" element={<ProjectDetailPage />} />
    <Route path="/notes" element={<MyNotesPage />} />
    <Route path="/notes/new" element={<DepositPage />} />
    <Route path="/notes/:noteId" element={<NoteDetailPage />} />
    <Route path="/portal/:statementCid" element={<StatementFundingPortalPage />} />
    <Route path="/portal/:statementCid/leaderboard" element={<CauseLeaderboardPage />} />
    <Route path="/refs" element={<MyRefsPage />} />
    <Route path="/content" element={<CreatorsLandingPage />} />
    <Route path="/content/:platform" element={<BrowseCreatorsPage />} />
    <Route path="/content/:platform/:channelId" element={<ChannelPage />} />
    <Route path="/content/:platform/:channelId/new" element={<CreateContractPage />} />
    <Route path="/content/dashboard" element={<CreatorDashboardPage />} />
    <Route path="/docs" element={<DocsPage />} />
    <Route path="/docs/*" element={<DocsPage />} />
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
