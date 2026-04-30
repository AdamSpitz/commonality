import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { MovementLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<MovementLandingPage />} />
    <Route path="/about" element={lazyRoute(() => import('./MovementPages'), 'MovementAboutPage')} />
    <Route path="/organize" element={lazyRoute(() => import('./MovementPages'), 'MovementOrganizingPage')} />
    <Route path="/statements" element={lazyRoute(() => import('../../conceptspace/pages/BrowseStatementsPage'), 'BrowseStatementsPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../conceptspace/pages/StatementPage'), 'StatementPage')} />
    <Route path="/profile" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/user/:address" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/content" element={lazyRoute(() => import('./MovementPages'), 'MovementCreatorsPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('./MovementPages'), 'MovementCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('./MovementPages'), 'MovementContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('./MovementPages'), 'MovementBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('./MovementPages'), 'MovementChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('./MovementPages'), 'MovementCreateContractPage')} />
    <Route path="/projects" element={lazyRoute(() => import('./MovementPages'), 'MovementProjectsPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('./MovementPages'), 'MovementCreateProjectPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('./MovementPages'), 'MovementProjectDetailPage')} />
    <Route path="/portal/:statementCid" element={lazyRoute(() => import('../../fundingportal/pages/StatementFundingPortalPage'), 'StatementFundingPortalPage')} />
    <Route path="/portal/:statementCid/leaderboard" element={lazyRoute(() => import('../../fundingportal/pages/CauseLeaderboardPage'), 'CauseLeaderboardPage')} />
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
