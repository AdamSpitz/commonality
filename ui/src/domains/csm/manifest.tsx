import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { CsmLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<CsmLandingPage />} />
    <Route path="/about" element={lazyRoute(() => import('./CsmPages'), 'CsmAboutPage')} />
    <Route path="/organize" element={lazyRoute(() => import('./CsmPages'), 'CsmNudgersPage')} />
    <Route path="/popular-statements" element={lazyRoute(() => import('./CsmPages'), 'CsmPopularStatementsPage')} />
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
      {
        label: 'Civility',
        get href() {
          return getDomainUrl('noninflammatory', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Tally',
        get href() {
          return getDomainUrl('tally', '/statements', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      {
        label: 'Alignment',
        get href() {
          return getDomainUrl('alignment', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Pubstarter',
        get href() {
          return getDomainUrl('pubstarter', '/', { fallbackHref: '#' })
        },
      },
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
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: CsmLandingPage,
}
