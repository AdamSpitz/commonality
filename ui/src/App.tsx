import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './shared/components/AppShell'
import { HomePage } from './conceptspace/pages/HomePage'
import { BrowseStatementsPage } from './conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from './conceptspace/pages/StatementPage'
import { UserProfilePage } from './conceptspace/pages/UserProfilePage'
import { SettingsPage } from './conceptspace/pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/statements" element={<BrowseStatementsPage />} />
          <Route path="/statement/:statementCid" element={<StatementPage />} />
          <Route path="/profile" element={<UserProfilePage />} />
          <Route path="/user/:address" element={<UserProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
