import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { HomePage } from './pages/HomePage'
import { CausesPage } from './pages/CausesPage'
import { CauseDetailPage } from './pages/CauseDetailPage'
import { AggregatesPage } from './pages/AggregatesPage'
import { AggregateDetailPage } from './pages/AggregateDetailPage'
import { MemberPage } from './pages/MemberPage'
import { ToolsPage } from './pages/ToolsPage'
import { ImportCausePage } from './pages/ImportCausePage'
import { NotFoundPage } from './pages/NotFoundPage'
import { createCausePath } from './lib/causeModel'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

function isHashRouting(): boolean {
  return import.meta.env.MODE === 'ipfs' || import.meta.env.VITE_HASH_ROUTING === 'true'
}

/** /start creates a draft cause and opens the editor (same idea as CauseStarter). */
function StartCauseRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(createCausePath(), { replace: true })
  }, [navigate])
  return null
}

export default function App() {
  const Router = isHashRouting() ? HashRouter : BrowserRouter

  return (
    <Router>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/start" element={<StartCauseRedirect />} />
          <Route path="/causes" element={<CausesPage />} />
          <Route path="/cause/:causeId" element={<CauseDetailPage />} />
          <Route path="/import-cause" element={<ImportCausePage />} />
          <Route path="/aggregates" element={<AggregatesPage />} />
          <Route path="/aggregate/:aggregateId" element={<AggregateDetailPage />} />
          <Route path="/member" element={<MemberPage />} />
          <Route path="/member/:address" element={<MemberPage />} />
          {/* :address also accepts username handles */}
          <Route path="/tools" element={<ToolsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </Router>
  )
}
