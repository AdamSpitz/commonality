import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { lazyRoute } from '../lazyRoute'
import { ContentFundingLandingPage } from './LandingPage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<ContentFundingLandingPage />} />
    <Route path="/about" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingAboutPage')} />
    <Route path="/content" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingCreatorsPage')} />
    <Route path="/content/new" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingStartContractPage')} />
    <Route path="/explore" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingExploreKindsPage')} />
    <Route path="/content/dashboard" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingCreatorDashboardPage')} />
    <Route path="/content/contracts/:projectAddress" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingContractPage')} />
    <Route path="/content/:platform" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingBrowsePage')} />
    <Route path="/content/:platform/:channelId" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingChannelPage')} />
    <Route path="/content/:platform/:channelId/new" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingCreateContractPage')} />
    <Route path="/content/:platform/:channelId/prospective/:roundAddress/materialize" element={lazyRoute(() => import('./ContentPages'), 'ContentFundingMaterializeFutureContentPage')} />
    <Route path="/delegation" element={lazyRoute(() => import('../delegation/LandingPage'), 'DelegationLandingPage')} />
    <Route path="/delegation/notes" element={lazyRoute(() => import('../../delegation/pages/MyNotesPage'), 'MyNotesPage')} />
    <Route path="/delegation/notes/new" element={lazyRoute(() => import('../../delegation/pages/DepositPage'), 'DepositPage')} />
    <Route path="/delegation/notes/:noteId" element={lazyRoute(() => import('../../delegation/pages/NoteDetailPage'), 'NoteDetailPage')} />
    <Route path="/docs" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
    <Route path="/docs/*" element={lazyRoute(() => import('../../docs/DocsPage'), 'DocsPage')} />
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
      { label: 'Start a Contract', path: '/content/new' },
      { label: 'How It Works', path: '/about' },
      { label: 'Docs', path: '/docs' },
      { label: 'Statements on Tally', domain: 'tally', path: '/statements' },
      { label: 'Creators', path: '/content/twitter' },
      { label: 'Delegation', path: '/delegation/notes' }
    ],
    secondaryNavigation: [
      { label: 'Start a Contract', path: '/content/new' },
      { label: 'Creator Dashboard', path: '/content/dashboard' },
      { label: 'Delegate funding decisions', path: '/delegation' },
      { label: 'About Content Funding', path: '/about' },
      { label: 'Twitter Creators', path: '/content/twitter' },
      { label: 'YouTube Creators', path: '/content/youtube' },
      { label: 'Substack Creators', path: '/content/substack' },
    ],
    footerText: 'Content Funding helps creators get funded directly by people who share their values.',
  },
  features: {
    conceptspace: false,
    lazyGiving: false,
    fundingportal: false,
    delegation: true,
    mutablerefs: false,
    contentFunding: true,
    docs: true,
  },
  basePath: '/',
  routes,
  LandingPage: ContentFundingLandingPage,
}
