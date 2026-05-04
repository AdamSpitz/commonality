import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { ConceptspaceLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<ConceptspaceLandingPage />} />
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
    ],
    secondaryNavigation: [],
    footerText: 'Conceptspace provides the statement, implication, signing, nudger, and trust primitives shared across Commonality sites.',
  },
  features: {
    conceptspace: true,
    pubstarter: false,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: ConceptspaceLandingPage,
}
