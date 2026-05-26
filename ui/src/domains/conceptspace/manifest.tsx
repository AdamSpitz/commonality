import type { ReactNode } from 'react'
import { Navigate, Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { ConceptspaceLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<ConceptspaceLandingPage />} />
    <Route path="/docs" element={<Navigate to="/docs/conceptspace" replace />} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const conceptspaceManifest: DomainManifest = {
  id: 'conceptspace',
  branding: {
    name: 'Conceptspace',
    tagline: 'Statement and trust infrastructure for public coordination.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Overview', path: '/' },
      { label: 'Developer Docs', path: '/docs' },
    ],
    secondaryNavigation: [],
    footerText: 'Conceptspace provides the statement, implication, signing, nudger, and trust primitives shared across the Commonality ecosystem sites.',
  },
  features: {
    conceptspace: true,
    lazyGiving: false,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: ConceptspaceLandingPage,
}
