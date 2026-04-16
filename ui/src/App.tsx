import { BrowserRouter, HashRouter, Routes } from 'react-router-dom'
import { AppShell } from './shared/components/AppShell'
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
        </Routes>
      </AppShell>
    </Router>
  )
}

export default App
