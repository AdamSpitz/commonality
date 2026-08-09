import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { CauseShell } from './shell/CauseShell'
import { HomePage } from './pages/HomePage'
import { StartCausePage } from './pages/StartCausePage'
import { MomentumPage } from './pages/MomentumPage'
import { CauseDetailPage } from './pages/CauseDetailPage'
import { CauseBoardPage } from './pages/CauseBoardPage'
import { CauseBoardLeaderboardPage } from './pages/CauseBoardLeaderboardPage'
import { EarmarkedFundsPage } from './pages/EarmarkedFundsPage'
import { DiscoverPage } from './pages/DiscoverPage'
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
          <Route path="/cause/:causeId" element={<CauseDetailPage />} />
          <Route path="/cause/:causeId/earmarked" element={<EarmarkedFundsPage />} />
          <Route path="/cause/:causeId/board" element={<CauseBoardPage />} />
          <Route path="/cause/:causeId/board/leaderboard" element={<CauseBoardLeaderboardPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/statement/:statementCid" element={<StatementPage />} />
          <Route path="/projects/:projectAddress" element={<ProjectDetailPage />} />
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </CauseShell>
    </Router>
  )
}
