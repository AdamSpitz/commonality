import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { CommonalityLandingPage } from './LandingPage'
import { CommonalityFounderPage } from './FounderPage'
import { CommonalityParticipatePage } from './ParticipatePage'
const routes: ReactNode = (
  <>
    <Route path="/" element={<CommonalityLandingPage />} />
    <Route path="/founders" element={<CommonalityFounderPage />} />
    <Route path="/participate" element={<CommonalityParticipatePage />} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const commonalityManifest: DomainManifest = {
  id: 'commonality',
  branding: {
    name: 'Commonality',
    tagline: 'A movement for better public-goods funding.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Thesis', path: '/docs/vision-and-strategy' },
      { label: 'Founder Pitch', path: '/founders' },
      {
        label: 'Pubstarter',
        get href() {
          return getDomainUrl('pubstarter', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Alignment',
        get href() {
          return getDomainUrl('alignment', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Delegation',
        get href() {
          return getDomainUrl('pubstarter', '/delegation', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      { label: 'User Docs', path: '/docs/roles' },
      { label: 'Key Ideas', path: '/docs/key-ideas' },
      { label: 'Walkthroughs', path: '/docs/use-case-walkthroughs/defunding' },
      {
        label: 'Tally',
        get href() {
          return getDomainUrl('tally', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Content Funding',
        get href() {
          return getDomainUrl('content-funding', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Common Sense Majority',
        get href() {
          return getDomainUrl('csm', '/', { fallbackHref: '#' })
        },
      },
      {
        label: 'Civility',
        get href() {
          return getDomainUrl('noninflammatory', '/', { fallbackHref: '#' })
        },
      },
    ],
    footerText: 'Commonality is the movement and thesis layer for better public-goods funding; concrete workflows live on focused product sites.',
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
  LandingPage: CommonalityLandingPage,
}
