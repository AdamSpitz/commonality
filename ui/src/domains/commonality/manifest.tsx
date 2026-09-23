import { installFundingSocialAssociation } from '../../shared/funding/installVerifiedSocialAssociation'

installFundingSocialAssociation()
import type { ReactNode } from 'react'
import { Navigate, Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { HomePage } from '../../commonality/pages/HomePage'
import { CauseShell } from '../../commonality/shell/CauseShell'
import { CommonalityFounderPage } from './FounderPage'
import { CommonalityForOrganizationsPage } from './ForOrganizationsPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={lazyRoute(() => import('../../commonality/pages/HomePage'), 'HomePage')} />
    <Route path="/dashboard" element={lazyRoute(() => import('../../commonality/pages/PersonalDashboardPage'), 'PersonalDashboardPage')} />
    <Route path="/profile" element={lazyRoute(() => import('../../commonality/pages/ProfilePage'), 'ProfilePage')} />
    <Route path="/donate" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'DonatePage')} />
    <Route path="/welcome" element={<Navigate to="/" replace />} />
    <Route path="/start" element={lazyRoute(() => import('../../commonality/pages/StartCauseRedirect'), 'StartCauseRedirect')} />
    <Route path="/bridge/new" element={lazyRoute(() => import('../../commonality/pages/StartBridgeRedirect'), 'StartBridgeRedirect')} />
    <Route path="/bridge/triple" element={lazyRoute(() => import('../../commonality/pages/BridgeTriplePage'), 'BridgeTriplePage')} />
    <Route path="/bridge/:owner/:slugPart" element={lazyRoute(() => import('../../commonality/pages/BridgeClusterPage'), 'BridgeClusterPage')} />
    <Route path="/bridge/:draftId" element={lazyRoute(() => import('../../commonality/pages/BridgeClusterPage'), 'BridgeClusterPage')} />
    <Route path="/causes" element={lazyRoute(() => import('../../commonality/pages/CausesPage'), 'CausesPage')} />
    <Route path="/work" element={lazyRoute(() => import('../../commonality/pages/WorkPage'), 'WorkPage')} />
    <Route path="/statements" element={lazyRoute(() => import('../../commonality/pages/StatementsPage'), 'StatementsPage')} />
    <Route path="/delegation" element={<Navigate to="/delegation/notes" replace />} />
    <Route path="/delegation/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/delegation/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/delegation/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/delegates/offer" element={lazyRoute(() => import('../../delegation/pages/DelegateProfilePage'), 'DelegateProfilePage')} />
    <Route path="/delegates/:address" element={lazyRoute(() => import('../../delegation/pages/DelegateProfilePage'), 'DelegateProfilePage')} />
    <Route path="/cause/:owner/:slugPart/content" element={lazyRoute(() => import('../../commonality/pages/CauseContentBoardPage'), 'CauseContentBoardPage')} />
    <Route path="/cause/:causeId/content" element={lazyRoute(() => import('../../commonality/pages/CauseContentBoardPage'), 'CauseContentBoardPage')} />
    <Route path="/cause/:owner/:slugPart/funding" element={lazyRoute(() => import('../../commonality/pages/CauseFundingPage'), 'CauseFundingPage')} />
    <Route path="/cause/:causeId/funding" element={lazyRoute(() => import('../../commonality/pages/CauseFundingPage'), 'CauseFundingPage')} />
    <Route path="/cause/:owner/:slugPart/leaderboard" element={lazyRoute(() => import('../../commonality/pages/CauseBoardLeaderboardPage'), 'CauseBoardLeaderboardPage')} />
    <Route path="/cause/:causeId/leaderboard" element={lazyRoute(() => import('../../commonality/pages/CauseBoardLeaderboardPage'), 'CauseBoardLeaderboardPage')} />
    <Route path="/cause/:owner/:slugPart/mediator" element={lazyRoute(() => import('../../commonality/pages/CauseMediatorPage'), 'CauseMediatorPage')} />
    <Route path="/cause/:causeId/mediator" element={lazyRoute(() => import('../../commonality/pages/CauseMediatorPage'), 'CauseMediatorPage')} />
    <Route path="/cause/:owner/:slugPart/edit" element={lazyRoute(() => import('../../commonality/pages/CauseDetailPage'), 'CauseDetailEditPage')} />
    <Route path="/cause/:causeId/edit" element={lazyRoute(() => import('../../commonality/pages/CauseDetailPage'), 'CauseDetailEditPage')} />
    <Route path="/cause/:owner/:slugPart" element={lazyRoute(() => import('../../commonality/pages/CauseDetailPage'), 'CauseDetailPage')} />
    <Route path="/cause/:causeId" element={lazyRoute(() => import('../../commonality/pages/CauseDetailPage'), 'CauseDetailPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../commonality/pages/StatementPage'), 'StatementPage')} />
    <Route path="/statement/:statementCid/board" element={lazyRoute(() => import('../../commonality/pages/StatementBoardRedirect'), 'StatementBoardRedirect')} />
    <Route path="/statement/:statementCid/board/leaderboard" element={lazyRoute(() => import('../../commonality/pages/StatementBoardLeaderboardPage'), 'StatementBoardLeaderboardPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('../../lazy-giving/pages/CreateProjectPage'), 'CreateProjectPage')} />
    <Route path="/projects/:projectAddress/leaderboard" element={lazyRoute(() => import('../../commonality/pages/ProjectDetailPage'), 'ProjectLeaderboardPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('../../commonality/pages/ProjectDetailPage'), 'ProjectDetailPage')} />
    <Route path="/content-funding" element={lazyRoute(() => import('../content-funding/LandingPage'), 'ContentFundingLandingPage')} />
    <Route path="/content-funding/about" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingAboutPage')} />
    <Route path="/content" element={lazyRoute(() => import('../content-funding/ContentPages'), 'CommonalityContentFundingCreatorsPage')} />
    <Route path="/content/new" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingStartContractPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingCreateContractPage')} />
    <Route path="/content/:platform/:channelId/prospective/:roundAddress/materialize" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingMaterializeFutureContentPage')} />
    <Route path="/explore" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingExploreKindsPage')} />
    <Route path="/founders" element={<CommonalityFounderPage />} />
    <Route path="/for-organizations" element={<CommonalityForOrganizationsPage />} />
    <Route path="/docs" element={lazyRoute(() => import('../../commonality/pages/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../commonality/pages/DocsPage'), 'DocsPage')} />
    <Route path="/tools" element={<Navigate to="/docs" replace />} />
    <Route path="/settings" element={lazyRoute(() => import('../../commonality/pages/SettingsPage'), 'SettingsPage')} />
    <Route path="/admin/test-data" element={lazyRoute(() => import('../../commonality/pages/TestDataAdminPage'), 'TestDataAdminPage')} />
    <Route path="/admin/test-data/:runId" element={lazyRoute(() => import('../../commonality/pages/TestDataRunPage'), 'TestDataRunPage')} />
  </>
)

export const commonalityManifest: DomainManifest = {
  id: 'commonality',
  branding: {
    name: 'Commonality',
    tagline: 'Organize a cause, enroll people, fund the work.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Organize', path: '/causes' },
      { label: 'Work', path: '/work' },
      { label: 'Sign', path: '/statements' },
      { label: 'Donate', path: '/donate' },
      { label: 'Fund', path: '/dashboard' },
      { label: 'Docs', path: '/docs' },
    ],
    secondaryNavigation: [
      { label: 'Profile', path: '/profile' },
      { label: 'Settings', path: '/settings' },
    ],
    footerText: 'Commonality is a lens: it renders a cause you already have a link to. It does not rank or directory causes.',
  },
  basePath: '/',
  routes,
  Shell: CauseShell,
  LandingPage: HomePage,
}
