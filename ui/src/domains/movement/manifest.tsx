import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { MovementLandingPage } from './LandingPage'
import {
  MovementAboutPage,
  MovementBrowsePage,
  MovementChannelPage,
  MovementContractPage,
  MovementCreateContractPage,
  MovementCreateProjectPage,
  MovementCreatorDashboardPage,
  MovementCreatorsPage,
  MovementOrganizingPage,
  MovementProjectDetailPage,
  MovementProjectsPage,
} from './MovementPages'
import { BrowseStatementsPage } from '../../conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from '../../conceptspace/pages/StatementPage'
import { UserProfilePage } from '../../conceptspace/pages/UserProfilePage'
import { StatementFundingPortalPage, CauseLeaderboardPage } from '../../fundingportal/pages'

const routes: ReactNode = (
  <>
    <Route path="/" element={<MovementLandingPage />} />
    <Route path="/about" element={<MovementAboutPage />} />
    <Route path="/organize" element={<MovementOrganizingPage />} />
    <Route path="/statements" element={<BrowseStatementsPage />} />
    <Route path="/statement/:statementCid" element={<StatementPage />} />
    <Route path="/profile" element={<UserProfilePage />} />
    <Route path="/user/:address" element={<UserProfilePage />} />
    <Route path="/content" element={<MovementCreatorsPage />} />
    <Route path="/content/dashboard" element={<MovementCreatorDashboardPage />} />
    <Route path="/content/contracts/:projectAddress" element={<MovementContractPage />} />
    <Route path="/content/:platform" element={<MovementBrowsePage />} />
    <Route path="/content/:platform/:channelId" element={<MovementChannelPage />} />
    <Route path="/content/:platform/:channelId/new" element={<MovementCreateContractPage />} />
    <Route path="/projects" element={<MovementProjectsPage />} />
    <Route path="/projects/new" element={<MovementCreateProjectPage />} />
    <Route path="/projects/:projectAddress" element={<MovementProjectDetailPage />} />
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
      { label: 'Organize', path: '/organize' },
      { label: 'Browse Content', path: '/content' },
      { label: 'Projects', path: '/projects' },
      { label: 'Statements', path: '/statements' },
    ],
    secondaryNavigation: [
      { label: 'About the movement', path: '/about' },
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'Start a Project', path: '/projects/new' },
      { label: 'My Profile', path: '/profile' },
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
