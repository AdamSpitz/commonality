import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { MovementLandingPage } from './LandingPage'
import { BrowseCreatorsPage } from '../../content-funding/pages/BrowseCreatorsPage'
import { CreatorsLandingPage } from '../../content-funding/pages/CreatorsLandingPage'
import { ChannelPage } from '../../content-funding/pages/ChannelPage'
import { CreateContractPage } from '../../content-funding/pages/CreateContractPage'
import { CreatorDashboardPage } from '../../content-funding/pages/CreatorDashboardPage'
import { BrowseStatementsPage } from '../../conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from '../../conceptspace/pages/StatementPage'
import { UserProfilePage } from '../../conceptspace/pages/UserProfilePage'
import { BrowseProjectsPage } from '../../pubstarter/pages/BrowseProjectsPage'
import { ProjectDetailPage } from '../../pubstarter/pages/ProjectDetailPage'
import { CreateProjectPage } from '../../pubstarter/pages/CreateProjectPage'
import { StatementFundingPortalPage, CauseLeaderboardPage } from '../../fundingportal/pages'

const routes: ReactNode = (
  <>
    <Route path="/" element={<MovementLandingPage />} />
    <Route path="/statements" element={<BrowseStatementsPage />} />
    <Route path="/statement/:statementCid" element={<StatementPage />} />
    <Route path="/profile" element={<UserProfilePage />} />
    <Route path="/user/:address" element={<UserProfilePage />} />
    <Route path="/content" element={<CreatorsLandingPage />} />
    <Route path="/content/:platform" element={<BrowseCreatorsPage />} />
    <Route path="/content/:platform/:channelId" element={<ChannelPage />} />
    <Route path="/content/:platform/:channelId/new" element={<CreateContractPage />} />
    <Route path="/content/dashboard" element={<CreatorDashboardPage />} />
    <Route path="/projects" element={<BrowseProjectsPage />} />
    <Route path="/projects/new" element={<CreateProjectPage />} />
    <Route path="/projects/:projectAddress" element={<ProjectDetailPage />} />
    <Route path="/portal/:statementCid" element={<StatementFundingPortalPage />} />
    <Route path="/portal/:statementCid/leaderboard" element={<CauseLeaderboardPage />} />
  </>
)

export const movementManifest: DomainManifest = {
  id: 'movement',
  branding: {
    name: 'Common Sense Majority',
    tagline: 'The silent majority finds its voice.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Content', path: '/content' },
      { label: 'Projects', path: '/projects' },
      { label: 'Statements', path: '/statements' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'Start a Project', path: '/projects/new' },
    ],
    footerText: 'Common Sense Majority organizes the hidden majority around common-sense positions.',
  },
  features: {
    conceptspace: true,
    pubstarter: true,
    fundingportal: true,
    delegation: false,
    mutablerefs: false,
    contentFunding: true,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: MovementLandingPage,
}
