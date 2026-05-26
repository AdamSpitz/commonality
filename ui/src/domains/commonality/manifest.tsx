import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
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
      { label: 'Docs', path: '/docs' },
      { label: 'LazyGiving', domain: 'lazyGiving', path: '/' },
      { label: 'Alignment', domain: 'alignment', path: '/' },
      { label: 'Delegation', domain: 'lazyGiving', path: '/delegation/notes' },
    ],
    secondaryNavigation: [
      { label: 'Tally', domain: 'tally', path: '/' },
      { label: 'Content Funding', domain: 'content-funding', path: '/' },
      { label: 'Common Sense Majority', domain: 'csm', path: '/' },
      { label: 'Civility', domain: 'noninflammatory', path: '/' },
    ],
    footerText: 'Commonality is the movement and thesis layer for better public-goods funding; concrete workflows live on focused product sites.',
  },
  features: {
    conceptspace: false,
    lazyGiving: false,
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
