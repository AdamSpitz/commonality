import type { ReactNode } from 'react'
import { Route } from 'react-router-dom'
import type { DomainManifest } from '../types'
import { ContentFundingLandingPage } from './LandingPage'
import {
  ContentFundingBrowsePage,
  ContentFundingChannelPage,
  ContentFundingContractPage,
  ContentFundingCreateContractPage,
  ContentFundingCreatorDashboardPage,
  ContentFundingCreatorsPage,
} from './ContentPages'
import { BrowseStatementsPage } from '../../conceptspace/pages/BrowseStatementsPage'
import { StatementPage } from '../../conceptspace/pages/StatementPage'
import { UserProfilePage } from '../../conceptspace/pages/UserProfilePage'

const routes: ReactNode = (
  <>
    <Route path="/" element={<ContentFundingLandingPage />} />
    <Route path="/statements" element={<BrowseStatementsPage />} />
    <Route path="/statement/:statementCid" element={<StatementPage />} />
    <Route path="/profile" element={<UserProfilePage />} />
    <Route path="/user/:address" element={<UserProfilePage />} />
    <Route path="/content" element={<ContentFundingCreatorsPage />} />
    <Route path="/content/dashboard" element={<ContentFundingCreatorDashboardPage />} />
    <Route path="/content/contracts/:projectAddress" element={<ContentFundingContractPage />} />
    <Route path="/content/:platform" element={<ContentFundingBrowsePage />} />
    <Route path="/content/:platform/:channelId" element={<ContentFundingChannelPage />} />
    <Route path="/content/:platform/:channelId/new" element={<ContentFundingCreateContractPage />} />
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
