import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { NoninflammatoryLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<NoninflammatoryLandingPage />} />
    <Route path="/statements" element={lazyRoute(() => import('../../conceptspace/pages/BrowseStatementsPage'), 'BrowseStatementsPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../conceptspace/pages/StatementPage'), 'StatementPage')} />
    <Route path="/profile" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/user/:address" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/content" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryCreatorsPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryCreateContractPage')} />
    <Route path="/about" element={lazyRoute(() => import('./ContentPages'), 'NoninflammatoryAboutPage')} />
  </>
)

export const noninflammatoryManifest: DomainManifest = {
  id: 'noninflammatory',
  branding: {
    name: 'Noninflammatory Content',
    tagline: 'Build bridges, not walls.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Content', path: '/content' },
      { label: "I'm a Creator", path: '/content/dashboard' },
      { label: 'Statements', path: '/statements' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
      { label: 'About', path: '/about' },
    ],
    footerText: 'Noninflammatory Content rewards creators who communicate across divides.',
  },
  features: {
    conceptspace: true,
    pubstarter: false,
    fundingportal: false,
    delegation: false,
    mutablerefs: false,
    contentFunding: true,
    docs: false,
  },
  basePath: '/',
  routes,
  LandingPage: NoninflammatoryLandingPage,
}
