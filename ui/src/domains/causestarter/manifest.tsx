import type { ReactNode } from 'react'
import { Navigate, Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { WelcomePage } from '../../causestarter/pages/WelcomePage'
import { CauseShell } from '../../causestarter/shell/CauseShell'

const routes: ReactNode = (
  <>
    <Route path="/" element={lazyRoute(() => import('../../causestarter/pages/HomePage'), 'HomePage')} />
    <Route path="/dashboard" element={lazyRoute(() => import('../../causestarter/pages/PersonalDashboardPage'), 'PersonalDashboardPage')} />
    <Route path="/welcome" element={lazyRoute(() => import('../../causestarter/pages/WelcomePage'), 'WelcomePage')} />
    <Route path="/start" element={lazyRoute(() => import('../../causestarter/pages/StartCauseRedirect'), 'StartCauseRedirect')} />
    <Route path="/bridge/new" element={lazyRoute(() => import('../../causestarter/pages/StartBridgeRedirect'), 'StartBridgeRedirect')} />
    <Route path="/bridge/triple" element={lazyRoute(() => import('../../causestarter/pages/BridgeTriplePage'), 'BridgeTriplePage')} />
    <Route path="/bridge/:owner/:slugPart" element={lazyRoute(() => import('../../causestarter/pages/BridgeClusterPage'), 'BridgeClusterPage')} />
    <Route path="/bridge/:draftId" element={lazyRoute(() => import('../../causestarter/pages/BridgeClusterPage'), 'BridgeClusterPage')} />
    <Route path="/causes" element={lazyRoute(() => import('../../causestarter/pages/CausesPage'), 'CausesPage')} />
    <Route path="/statements" element={lazyRoute(() => import('../../causestarter/pages/StatementsPage'), 'StatementsPage')} />
    <Route path="/delegation" element={<Navigate to="/delegation/notes" replace />} />
    <Route path="/delegation/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/delegation/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/delegation/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/delegates/offer" element={lazyRoute(() => import('../../delegation/pages/DelegateProfilePage'), 'DelegateProfilePage')} />
    <Route path="/delegates/:address" element={lazyRoute(() => import('../../delegation/pages/DelegateProfilePage'), 'DelegateProfilePage')} />
    <Route path="/cause/:owner/:slugPart/content" element={lazyRoute(() => import('../../causestarter/pages/CauseContentBoardPage'), 'CauseContentBoardPage')} />
    <Route path="/cause/:causeId/content" element={lazyRoute(() => import('../../causestarter/pages/CauseContentBoardPage'), 'CauseContentBoardPage')} />
    <Route path="/cause/:owner/:slugPart/funding" element={lazyRoute(() => import('../../causestarter/pages/CauseFundingPage'), 'CauseFundingPage')} />
    <Route path="/cause/:causeId/funding" element={lazyRoute(() => import('../../causestarter/pages/CauseFundingPage'), 'CauseFundingPage')} />
    <Route path="/cause/:owner/:slugPart/leaderboard" element={lazyRoute(() => import('../../causestarter/pages/CauseBoardLeaderboardPage'), 'CauseBoardLeaderboardPage')} />
    <Route path="/cause/:causeId/leaderboard" element={lazyRoute(() => import('../../causestarter/pages/CauseBoardLeaderboardPage'), 'CauseBoardLeaderboardPage')} />
    <Route path="/cause/:owner/:slugPart/mediator" element={lazyRoute(() => import('../../causestarter/pages/CauseMediatorPage'), 'CauseMediatorPage')} />
    <Route path="/cause/:causeId/mediator" element={lazyRoute(() => import('../../causestarter/pages/CauseMediatorPage'), 'CauseMediatorPage')} />
    <Route path="/cause/:owner/:slugPart/edit" element={lazyRoute(() => import('../../causestarter/pages/CauseDetailPage'), 'CauseDetailEditPage')} />
    <Route path="/cause/:causeId/edit" element={lazyRoute(() => import('../../causestarter/pages/CauseDetailPage'), 'CauseDetailEditPage')} />
    <Route path="/cause/:owner/:slugPart" element={lazyRoute(() => import('../../causestarter/pages/CauseDetailPage'), 'CauseDetailPage')} />
    <Route path="/cause/:causeId" element={lazyRoute(() => import('../../causestarter/pages/CauseDetailPage'), 'CauseDetailPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../causestarter/pages/StatementPage'), 'StatementPage')} />
    <Route path="/statement/:statementCid/board" element={lazyRoute(() => import('../../causestarter/pages/StatementBoardRedirect'), 'StatementBoardRedirect')} />
    <Route path="/statement/:statementCid/board/leaderboard" element={lazyRoute(() => import('../../causestarter/pages/StatementBoardLeaderboardPage'), 'StatementBoardLeaderboardPage')} />
    <Route path="/projects/new" element={lazyRoute(() => import('../../lazy-giving/pages/CreateProjectPage'), 'CreateProjectPage')} />
    <Route path="/projects/:projectAddress/leaderboard" element={lazyRoute(() => import('../../causestarter/pages/ProjectDetailPage'), 'ProjectLeaderboardPage')} />
    <Route path="/projects/:projectAddress" element={lazyRoute(() => import('../../causestarter/pages/ProjectDetailPage'), 'ProjectDetailPage')} />
    <Route path="/content-funding" element={lazyRoute(() => import('../content-funding/LandingPage'), 'ContentFundingLandingPage')} />
    <Route path="/content-funding/about" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingAboutPage')} />
    <Route path="/content" element={lazyRoute(() => import('../content-funding/ContentPages'), 'CauseStarterContentFundingCreatorsPage')} />
    <Route path="/content/new" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingStartContractPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingCreateContractPage')} />
    <Route path="/content/:platform/:channelId/prospective/:roundAddress/materialize" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingMaterializeFutureContentPage')} />
    <Route path="/explore" element={lazyRoute(() => import('../content-funding/ContentPages'), 'ContentFundingExploreKindsPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../causestarter/pages/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../causestarter/pages/DocsPage'), 'DocsPage')} />
    <Route path="/tools" element={<Navigate to="/docs" replace />} />
    <Route path="/settings" element={lazyRoute(() => import('../../causestarter/pages/SettingsPage'), 'SettingsPage')} />
  </>
)

export const causestarterManifest: DomainManifest = {
  id: 'causestarter',
  branding: {
    name: 'CauseStarter',
    tagline: 'Organize a cause, enroll people, fund the work.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Cause boards', path: '/causes' },
      { label: 'Docs', path: '/docs' },
    ],
    secondaryNavigation: [
      { label: 'Settings', path: '/settings' },
    ],
    footerText: 'CauseStarter is a lens: it renders a cause you already have a link to. It does not rank or directory causes.',
  },
  basePath: '/',
  routes,
  Shell: CauseShell,
  LandingPage: WelcomePage,
}
