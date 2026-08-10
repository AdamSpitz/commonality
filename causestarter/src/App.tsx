import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { CauseShell } from './shell/CauseShell'
import { HomePage } from './pages/HomePage'
import { StartCausePage } from './pages/StartCausePage'
import { MomentumPage } from './pages/MomentumPage'
import { CauseDetailPage } from './pages/CauseDetailPage'
import { StatementBoardPage } from './pages/StatementBoardPage'
import { StatementBoardLeaderboardPage } from './pages/StatementBoardLeaderboardPage'
import { StatementPage } from './pages/StatementPage'
import { ToolsPage } from './pages/ToolsPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
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
          <Route path="/start" element={<StartCausePage />} />
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
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </CauseShell>
    </Router>
  )
}
