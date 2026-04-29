import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './shared/components/AppShell'
import { NotFoundPage } from './shared/components/NotFoundPage'
import { getActiveDomain } from './domains'
import { isHashRouting } from './shared/routing'

function App() {
  const Router = isHashRouting() ? HashRouter : BrowserRouter
  const domain = getActiveDomain()

  return (
    <Router>
      <AppShell
        branding={domain.branding}
        navigation={domain.shell}
      >
        <Routes>
          {domain.routes}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </Router>
  )
}

export default App
