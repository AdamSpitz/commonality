import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { ContentFundingLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<ContentFundingLandingPage />} />
    <Route path="/statements" element={lazyRoute(() => import('../../conceptspace/pages/BrowseStatementsPage'), 'BrowseStatementsPage')} />
    <Route path="/statement/:statementCid" element={lazyRoute(() => import('../../conceptspace/pages/StatementPage'), 'StatementPage')} />
    <Route path="/profile" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/user/:address" element={lazyRoute(() => import('../../conceptspace/pages/UserProfilePage'), 'UserProfilePage')} />
    <Route path="/content" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingCreatorsPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingCreateContractPage')} />
  </>
)

export const contentFundingManifest: DomainManifest = {
  id: 'content-funding',
  branding: {
    name: 'Content Funding',
    tagline: 'Fund content you believe in.',
  },
  shell: {
    primaryNavigation: [
      { label: 'Browse Content', path: '/content' },
      { label: 'Statements', path: '/statements' },
      { label: 'Creators', path: '/content/twitter' },
      { label: 'My Profile', path: '/profile' },
    ],
    secondaryNavigation: [
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
    ],
    footerText: 'Content Funding helps creators get funded directly by people who share their values.',
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
  LandingPage: ContentFundingLandingPage,
}
