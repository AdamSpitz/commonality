import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CauseShell } from './shell/CauseShell'
import { HomePage } from './pages/HomePage'
import { StartCauseRedirect } from './pages/StartCauseRedirect'
import { StartBridgeRedirect } from './pages/StartBridgeRedirect'
import { BridgeClusterPage } from './pages/BridgeClusterPage'
import { BridgeTriplePage } from './pages/BridgeTriplePage'
import { CausesPage } from './pages/CausesPage'
import { CauseDetailPage } from './pages/CauseDetailPage'
import { CauseMediatorPage } from './pages/CauseMediatorPage'
import { CauseBoardLeaderboardPage } from './pages/CauseBoardLeaderboardPage'
import { StatementBoardLeaderboardPage } from './pages/StatementBoardLeaderboardPage'
import { StatementBoardRedirect } from './pages/StatementBoardRedirect'
import { StatementPage } from './pages/StatementPage'
import { DocsPage } from './pages/DocsPage'
import { StatementsPage } from './pages/StatementsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProjectDetailPage, ProjectLeaderboardPage } from './pages/ProjectDetailPage'
import { CreateProjectPage } from './pages/CreateProjectPage'
import { CauseContentBoardPage } from './pages/CauseContentBoardPage'
import { CauseFundingPage } from './pages/CauseFundingPage'
import {
  ContentFundingAboutPage,
  ContentFundingBrowsePage,
  ContentFundingChannelPage,
  ContentFundingContractPage,
  ContentFundingCreateContractPage,
  ContentFundingCreatorDashboardPage,
  ContentFundingCreatorsPage,
  ContentFundingExploreKindsPage,
  ContentFundingLandingPage,
  ContentFundingMaterializeFutureContentPage,
  ContentFundingStartContractPage,
} from './pages/ContentFundingPages'
import {
  DelegateProfilePage,
  DepositPage,
  MyNotesPage,
  NoteDetailPage,
} from './pages/DelegationPages'
import { NotFoundPage } from './pages/NotFoundPage'

function isHashRouting(): boolean {
  return import.meta.env.MODE === 'ipfs' || import.meta.env.VITE_HASH_ROUTING === 'true'
}

export default function App() {
  const Router = isHashRouting() ? HashRouter : BrowserRouter

  return (
    <Router>
      <CauseShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* No intermediate form — creates a draft and opens the editor. */}
          <Route path="/start" element={<StartCauseRedirect />} />
          <Route path="/bridge/new" element={<StartBridgeRedirect />} />
          <Route path="/bridge/triple" element={<BridgeTriplePage />} />
          <Route path="/bridge/:owner/:slugPart" element={<BridgeClusterPage />} />
          <Route path="/bridge/:draftId" element={<BridgeClusterPage />} />
          <Route path="/causes" element={<CausesPage />} />
          <Route path="/statements" element={<StatementsPage />} />
          <Route path="/delegation" element={<Navigate to="/delegation/notes" replace />} />
          <Route path="/delegation/notes" element={<MyNotesPage />} />
          <Route path="/delegation/notes/new" element={<DepositPage />} />
          <Route path="/delegation/notes/:noteId" element={<NoteDetailPage />} />
          <Route path="/delegates/offer" element={<DelegateProfilePage />} />
          <Route path="/delegates/:address" element={<DelegateProfilePage />} />
          {/* Local drafts use a UUID. Published causes use
              /cause/:owner/:slug[@versionCid] — stable id + optional pin.
              See docs/founder/shaping-your-cause-statements.md § roster. */}
          <Route path="/cause/:owner/:slugPart/content" element={<CauseContentBoardPage />} />
          <Route path="/cause/:causeId/content" element={<CauseContentBoardPage />} />
          <Route path="/cause/:owner/:slugPart/funding" element={<CauseFundingPage />} />
          <Route path="/cause/:causeId/funding" element={<CauseFundingPage />} />
          <Route path="/cause/:owner/:slugPart/leaderboard" element={<CauseBoardLeaderboardPage />} />
          <Route path="/cause/:causeId/leaderboard" element={<CauseBoardLeaderboardPage />} />
          <Route path="/cause/:owner/:slugPart/mediator" element={<CauseMediatorPage />} />
          <Route path="/cause/:causeId/mediator" element={<CauseMediatorPage />} />
          <Route path="/cause/:owner/:slugPart/edit" element={<CauseDetailPage editMode />} />
          <Route path="/cause/:causeId/edit" element={<CauseDetailPage editMode />} />
          <Route path="/cause/:owner/:slugPart" element={<CauseDetailPage />} />
          <Route path="/cause/:causeId" element={<CauseDetailPage />} />
          {/* No browse or search route by design: a cause is reached by its own
              link, never by a directory we rank. See ADR 0005 and
              specs/product/ui-operator-posture.md. */}
          <Route path="/statement/:statementCid" element={<StatementPage />} />
          {/* Old standalone board URL: the dashboard now lives on the statement. */}
          <Route
            path="/statement/:statementCid/board"
            element={<StatementBoardRedirect />}
          />
          <Route path="/statement/:statementCid/board/leaderboard" element={<StatementBoardLeaderboardPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:projectAddress/leaderboard" element={<ProjectLeaderboardPage />} />
          <Route path="/projects/:projectAddress" element={<ProjectDetailPage />} />
          <Route path="/content-funding" element={<ContentFundingLandingPage />} />
          <Route path="/content-funding/about" element={<ContentFundingAboutPage />} />
          <Route path="/content" element={<ContentFundingCreatorsPage />} />
          <Route path="/content/new" element={<ContentFundingStartContractPage />} />
          <Route path="/content/dashboard" element={<ContentFundingCreatorDashboardPage />} />
          <Route path="/content/contracts/:projectAddress" element={<ContentFundingContractPage />} />
          <Route path="/content/:platform" element={<ContentFundingBrowsePage />} />
          <Route path="/content/:platform/:channelId" element={<ContentFundingChannelPage />} />
          <Route path="/content/:platform/:channelId/new" element={<ContentFundingCreateContractPage />} />
          <Route path="/content/:platform/:channelId/prospective/:roundAddress/materialize" element={<ContentFundingMaterializeFutureContentPage />} />
          <Route path="/explore" element={<ContentFundingExploreKindsPage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/tools" element={<Navigate to="/docs" replace />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </CauseShell>
    </Router>
  )
}
