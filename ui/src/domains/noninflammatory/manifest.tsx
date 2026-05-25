import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { getDomainUrl } from '../domainUrls'
import { NoninflammatoryLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<NoninflammatoryLandingPage />} />
    <Route path="/content" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryCreatorsPage')} />
    <Route path="/filters" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryFiltersPage')} />
    <Route path="/popular-statements" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryPopularStatementsPage')} />
    <Route path="/nominate" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryNominatePage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryCreateContractPage')} />
    <Route path="/about" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryAboutPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
  </>
)

export const noninflammatoryManifest: DomainManifest = {
  id: 'noninflammatory',
  branding: {
    name: 'Civility',
    tagline: 'Build bridges, not walls.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Content', path: '/content' },
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      {
        label: 'Statements on Tally',
        get href() {
          return getDomainUrl('tally', '/statements', { fallbackHref: '#' })
        },
      },
    ],
    secondaryNavigation: [
      { label: 'Popular Statements', path: '/popular-statements' },
      { label: 'Nominate a Creator', path: '/nominate' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'About', path: '/about' },
    ],
    footerText: 'Civility rewards creators who communicate across divides.',
  },
  features: {
    conceptspace: false,
    pubstarter: false,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: true,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: NoninflammatoryLandingPage,
}
