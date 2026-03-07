import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './shared/components/AppShell'
import { HomePage } from './conceptspace/pages/HomePage'
import { BrowseStatementsPage } from './conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from './conceptspace/pages/StatementPage'
import { UserProfilePage } from './conceptspace/pages/UserProfilePage'
import { SettingsPage } from './conceptspace/pages/SettingsPage'
import { BrowseProjectsPage } from './pubstarter/pages/BrowseProjectsPage'
import { ProjectDetailPage } from './pubstarter/pages/ProjectDetailPage'
import { CreateProjectPage } from './pubstarter/pages/CreateProjectPage'
import { MyNotesPage, NoteDetailPage, DepositPage } from './delegation/pages'

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
          <Route path="/projects" element={<BrowseProjectsPage />} />
          <Route path="/projects/new" element={<CreateProjectPage />} />
          <Route path="/projects/:projectAddress" element={<ProjectDetailPage />} />
          <Route path="/notes" element={<MyNotesPage />} />
          <Route path="/notes/new" element={<DepositPage />} />
          <Route path="/notes/:noteId" element={<NoteDetailPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  )
}

export default App
