import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './shared/components/AppShell'
import { CrossDomainUnavailablePage } from './shared'
import { NotFoundPage } from './shared'
import { getActiveDomain } from './domains'
import { isHashRouting, loadDisplayDenylist } from './shared'
import { CauseShell } from './causestarter/shell/CauseShell'

function DomainChrome({ children }: { children: ReactNode }) {
  const domain = getActiveDomain()
  if (domain.useCauseShell) {
    return <CauseShell>{children}</CauseShell>
  }
  return (
    <AppShell
      branding={domain.branding}
      navigation={domain.shell}
    >
      {children}
    </AppShell>
  )
}

function App() {
  const Router = isHashRouting() ? HashRouter : BrowserRouter
  const domain = getActiveDomain()

  useEffect(() => {
    void loadDisplayDenylist()
  }, [])

  return (
    <Router>
      <DomainChrome>
        <Routes>
          {domain.routes}
          <Route path="/_cross-domain-unavailable" element={<CrossDomainUnavailablePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </DomainChrome>
    </Router>
  )
}

export default App
