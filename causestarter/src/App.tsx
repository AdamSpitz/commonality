import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { CauseShell } from './shell/CauseShell'
import { HomePage } from './pages/HomePage'
import { StartCauseRedirect } from './pages/StartCauseRedirect'
import { MomentumPage } from './pages/MomentumPage'
import { CauseDetailPage } from './pages/CauseDetailPage'
import { StatementBoardPage } from './pages/StatementBoardPage'
import { StatementBoardLeaderboardPage } from './pages/StatementBoardLeaderboardPage'
import { StatementPage } from './pages/StatementPage'
import { ToolsPage } from './pages/ToolsPage'
import { SettingsPage } from './pages/SettingsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
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
          <Route path="/momentum" element={<MomentumPage />} />
          {/* Local drafts use a UUID. Published causes use
              /cause/:owner/:slug[@versionCid] — stable id + optional pin.
              See docs/founder/shaping-your-cause-statements.md § roster. */}
          <Route path="/cause/:owner/:slugPart" element={<CauseDetailPage />} />
          <Route path="/cause/:causeId" element={<CauseDetailPage />} />
          {/* No browse or search route by design: a cause is reached by its own
              link, never by a directory we rank. See ADR 0005 and
              specs/product/ui-operator-posture.md. */}
          <Route path="/statement/:statementCid" element={<StatementPage />} />
          {/* Boards are keyed by statement: alignment attestations name a
              statement, never a cause. */}
          <Route path="/statement/:statementCid/board" element={<StatementBoardPage />} />
          <Route path="/statement/:statementCid/board/leaderboard" element={<StatementBoardLeaderboardPage />} />
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
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </CauseShell>
    </Router>
  )
}
