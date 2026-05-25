import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { CsmLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<CsmLandingPage />} />
    <Route path="/about" element={lazyRoute(() => import('./CsmPages'), 'CsmAboutPage')} />
    <Route path="/organize" element={lazyRoute(() => import('./CsmPages'), 'CsmNudgersPage')} />
    <Route path="/popular-statements" element={lazyRoute(() => import('./CsmPages'), 'CsmPopularStatementsPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const csmManifest: DomainManifest = {
  id: 'csm',
  branding: {
    name: 'Common Sense Majority',
    tagline: 'The hidden majority finds its voice.',
  },
  shell: {
    primaryNavigation: [
      { label: 'About', path: '/about' },
      { label: 'Popular Statements', path: '/popular-statements' },
      { label: 'Nudgers', path: '/organize' },
      { label: 'Civility', domain: 'noninflammatory', path: '/' },
      { label: 'Tally', domain: 'tally', path: '/statements' },
    ],
    secondaryNavigation: [
      { label: 'Alignment', domain: 'alignment', path: '/' },
      { label: 'Pubstarter', domain: 'pubstarter', path: '/' },
    ],
    footerText: 'Common Sense Majority organizes the hidden majority around common-sense positions.',
  },
  features: {
    conceptspace: false,
    pubstarter: false,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: false,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: CsmLandingPage,
}
