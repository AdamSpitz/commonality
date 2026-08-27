import { useEffect, type ReactNode } from 'react'
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom'
import { AppShell } from './shared/components/AppShell'
import { CrossDomainUnavailablePage } from './shared'
import { NotFoundPage } from './shared'
import { getActiveDomain } from './domains'
import { isHashRouting } from './shared'

function DomainChrome({ children }: { children: ReactNode }) {
  const domain = getActiveDomain()

  useEffect(() => {
    document.title = domain.branding.name
  }, [domain.branding.name])

  if (domain.Shell) {
    const Shell = domain.Shell
    return <Shell>{children}</Shell>
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
